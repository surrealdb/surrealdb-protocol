use std::{collections::VecDeque, pin::Pin};

use crate::{
    convert::TryFromValue,
    proto::{
        rpc::v1::{
            QueryBatchFrame, QueryResponse, export_config, query_batch_frame::Payload,
            query_response::Frame,
        },
        v1::{SurrealError, Value},
    },
};
use anyhow::{Result, anyhow};
use futures::{Stream, StreamExt};
use tonic::Streaming;
use tonic::async_trait;

impl QueryResponse {
    /// Wraps a [`QueryBegin`](crate::proto::rpc::v1::QueryBegin) frame.
    pub fn begin(begin: crate::proto::rpc::v1::QueryBegin) -> Self {
        Self {
            frame: Some(Frame::Begin(begin)),
        }
    }

    /// Wraps a batch frame.
    pub fn batch(batch: QueryBatchFrame) -> Self {
        Self {
            frame: Some(Frame::Batch(batch)),
        }
    }

    /// Builds the frame that completes a query stream successfully.
    pub fn end() -> Self {
        Self {
            frame: Some(Frame::End(crate::proto::rpc::v1::QueryEnd {})),
        }
    }

    /// Builds a terminal error frame.
    pub fn error(error: SurrealError) -> Self {
        Self {
            frame: Some(Frame::Error(error)),
        }
    }
}

impl QueryBatchFrame {
    /// Consumes the frame, returning its values, or the error it carries.
    pub fn into_values(self) -> Result<Vec<Value>> {
        if let Some(error) = self.error {
            return Err(error.into());
        }
        match self.payload {
            Some(Payload::Values(batch)) => Ok(batch.values),
            Some(Payload::Arrow(_)) => Err(anyhow!(
                "query returned a columnar batch, which this client did not request"
            )),
            None => Ok(Vec::new()),
        }
    }
}

/// Flattens a query stream into the values it carries.
///
/// Values are concatenated across every query index in arrival order, so this
/// is only correct for single-statement queries. Because responses for
/// different query indexes may be interleaved, a multi-statement consumer must
/// demultiplex [`QueryResponse`] batches by `query_index` itself; flattening
/// them loses the statement boundaries and interleaves unrelated results.
pub struct QueryResponseValueStream {
    stream: Streaming<QueryResponse>,
    current_values: VecDeque<Value>,
}

impl QueryResponseValueStream {
    /// Creates a new `QueryResponseValueStream` from a stream of query responses.
    pub fn new(stream: Streaming<QueryResponse>) -> Self {
        Self {
            stream,
            current_values: VecDeque::new(),
        }
    }
}

impl Stream for QueryResponseValueStream {
    type Item = Result<Value, anyhow::Error>;

    fn poll_next(
        self: Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        use std::task::Poll;

        let this = self.get_mut();

        // Loop rather than recurse: a run of frames that carry no values --
        // begin, empty batches, end -- must not grow the stack.
        loop {
            if let Some(value) = this.current_values.pop_front() {
                return Poll::Ready(Some(Ok(value)));
            }

            match this.stream.poll_next_unpin(cx) {
                Poll::Ready(Some(Ok(response))) => match response.frame {
                    Some(Frame::Batch(batch)) => match batch.into_values() {
                        Ok(values) => this.current_values.extend(values),
                        Err(error) => return Poll::Ready(Some(Err(error))),
                    },
                    Some(Frame::Error(error)) => {
                        return Poll::Ready(Some(Err(error.into())));
                    }
                    // Begin and end carry no values; an unset frame is an
                    // unrecognised variant from a newer server.
                    Some(Frame::Begin(_)) | Some(Frame::End(_)) => {}
                    None => {
                        return Poll::Ready(Some(Err(anyhow!(
                            "query stream carried an unrecognised frame"
                        ))));
                    }
                },
                Poll::Ready(Some(Err(e))) => {
                    return Poll::Ready(Some(Err(anyhow!("Stream error: {}", e))));
                }
                Poll::Ready(None) => return Poll::Ready(None),
                Poll::Pending => return Poll::Pending,
            }
        }
    }
}

impl From<bool> for export_config::Tables {
    fn from(value: bool) -> Self {
        if value {
            export_config::Tables {
                selection: Some(export_config::tables::Selection::All(Default::default())),
            }
        } else {
            export_config::Tables {
                selection: Some(export_config::tables::Selection::None(Default::default())),
            }
        }
    }
}

impl From<Vec<&str>> for export_config::Tables {
    fn from(values: Vec<&str>) -> Self {
        let mut selected_tables = export_config::SelectedTables::default();
        for v in values {
            selected_tables.tables.push(v.to_string());
        }
        export_config::Tables {
            selection: Some(export_config::tables::Selection::Selected(selected_tables)),
        }
    }
}

/// A trait for converting a stream of query responses into a specific type.
///
/// The provided implementations flatten values across every query index (see
/// [`QueryResponseValueStream`]), so they are only suitable for
/// single-statement queries.
#[async_trait]
pub trait TryFromQueryStream {
    /// Converts a stream of query responses into a specific type.
    async fn try_from_query_stream(stream: Streaming<QueryResponse>) -> Result<Self, anyhow::Error>
    where
        Self: Sized;
}

#[async_trait]
impl<T> TryFromQueryStream for Option<T>
where
    T: TryFromValue + Send,
{
    async fn try_from_query_stream(
        stream: Streaming<QueryResponse>,
    ) -> Result<Self, anyhow::Error> {
        let mut stream = QueryResponseValueStream::new(stream);
        let value = match stream.next().await {
            Some(Ok(value)) => value,
            Some(Err(e)) => return Err(e),
            None => return Ok(None),
        };
        let value = T::try_from_value(value)?;
        Ok(Some(value))
    }
}

#[async_trait]
impl<T> TryFromQueryStream for Vec<T>
where
    T: TryFromValue + Send,
{
    async fn try_from_query_stream(
        stream: Streaming<QueryResponse>,
    ) -> Result<Self, anyhow::Error> {
        let mut stream = QueryResponseValueStream::new(stream);
        let mut values = Vec::new();
        while let Some(value) = stream.next().await {
            let value = T::try_from_value(value?)?;
            values.push(value);
        }
        Ok(values)
    }
}
