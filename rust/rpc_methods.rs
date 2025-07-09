use std::{collections::VecDeque, error::Error, fmt::Display, pin::Pin};

use crate::proto::{
    rpc::v1::{QueryError, QueryResponse, export_sql_request},
    v1::Value,
};
use anyhow::{Result, anyhow};
use futures::{Stream, StreamExt};
use tonic::Streaming;
use tonic::async_trait;

impl QueryResponse {
    /// Returns the first value from the query response.
    pub fn first(mut self) -> Result<Value, anyhow::Error> {
        if let Some(err) = self.error {
            return Err(anyhow!("{}", err.message));
        }

        if self.values.is_empty() {
            return Err(anyhow!("No values returned"));
        }

        let value = self.values.remove(0);

        Ok(value)
    }

    /// Returns all values from the query response.
    pub fn values(self) -> Result<Vec<Value>, anyhow::Error> {
        if let Some(err) = self.error {
            return Err(anyhow!("{}", err.message));
        }

        Ok(self.values)
    }
}

/// Consumes a stream of query responses and returns a stream of values.
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
        mut self: Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        use std::task::Poll;

        let this = self.as_mut().get_mut();

        // If we have values in the current batch, yield the next one
        if let Some(value) = this.current_values.pop_front() {
            return Poll::Ready(Some(Ok(value)));
        }

        // Otherwise, try to get the next batch from the stream
        match this.stream.poll_next_unpin(cx) {
            Poll::Ready(Some(Ok(response))) => {
                // Check for errors in the response
                if let Some(err) = response.error {
                    return Poll::Ready(Some(Err(anyhow!("{}", err.message))));
                }

                // Extract values from the response and add them to the queue
                this.current_values.extend(response.values);

                // Yield the first value from this batch
                if let Some(value) = this.current_values.pop_front() {
                    Poll::Ready(Some(Ok(value)))
                } else {
                    // Empty batch, try again
                    self.poll_next(cx)
                }
            }
            Poll::Ready(Some(Err(e))) => {
                // Stream error
                Poll::Ready(Some(Err(anyhow!("Stream error: {}", e))))
            }
            Poll::Ready(None) => {
                // Stream ended
                Poll::Ready(None)
            }
            Poll::Pending => {
                // Stream not ready yet
                Poll::Pending
            }
        }
    }
}

impl From<bool> for export_sql_request::Tables {
    fn from(value: bool) -> Self {
        if value {
            export_sql_request::Tables {
                selection: Some(export_sql_request::tables::Selection::All(
                    Default::default(),
                )),
            }
        } else {
            export_sql_request::Tables {
                selection: Some(export_sql_request::tables::Selection::None(
                    Default::default(),
                )),
            }
        }
    }
}

impl QueryError {
    /// Creates a new `QueryError` with the given code and message.
    pub fn new(code: i64, message: String) -> Self {
        Self { code, message }
    }
}

impl Display for QueryError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "({}): {}", self.code, self.message)
    }
}

impl std::error::Error for QueryError {}

/// A trait for converting a stream of query responses into a specific type.
#[async_trait]
pub trait TryFromQueryStream<T> {
    /// The error type returned by the `try_from_query_stream` method.
    type Error;

    /// Converts a stream of query responses into a specific type.
    async fn try_from_query_stream(stream: Streaming<QueryResponse>) -> Result<Self, Self::Error>
    where
        Self: Sized;
}

#[async_trait]
impl<T> TryFromQueryStream<T> for T
where
    T: TryFrom<Value>,
    T::Error: Error + Send + Sync + 'static,
{
    type Error = anyhow::Error;

    async fn try_from_query_stream(stream: Streaming<QueryResponse>) -> Result<Self, Self::Error> {
        let mut stream = QueryResponseValueStream::new(stream);
        let value = match stream.next().await {
            Some(Ok(value)) => value,
            Some(Err(e)) => return Err(e),
            None => return Err(anyhow!("No value returned")),
        };
        let value = T::try_from(value)?;
        Ok(value)
    }
}

#[async_trait]
impl<T> TryFromQueryStream<Vec<T>> for Vec<T>
where
    T: TryFrom<Value> + Send,
    T::Error: Error + Send + Sync + 'static,
{
    type Error = anyhow::Error;

    async fn try_from_query_stream(stream: Streaming<QueryResponse>) -> Result<Self, Self::Error> {
        let mut stream = QueryResponseValueStream::new(stream);
        let mut values = Vec::new();
        while let Some(value) = stream.next().await {
            let value = T::try_from(value?)?;
            values.push(value);
        }
        Ok(values)
    }
}
