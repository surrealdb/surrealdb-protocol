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

impl export_config::Tables {
    /// Selects every table except the named ones.
    ///
    /// Not a `From<Vec<&str>>` impl, because that is already taken by the
    /// including form and the two are exact opposites: silently picking one when
    /// the caller meant the other exports the tables they asked to withhold.
    ///
    /// Only send this to a server advertising `EXPORT_EXCLUDE_TABLES`. A server
    /// predating the arm cannot decode it and must fail the export rather than
    /// fall back to exporting everything; see the note on `Tables` in rpc.proto.
    pub fn excluding<I, S>(tables: I) -> Self
    where
        I: IntoIterator<Item = S>,
        S: Into<String>,
    {
        Self {
            selection: Some(export_config::tables::Selection::Excluded(
                export_config::ExcludedTables {
                    tables: tables.into_iter().map(Into::into).collect(),
                },
            )),
        }
    }

    /// Selects only the named tables.
    ///
    /// The counterpart to [`Tables::excluding`], named so that a reader of the
    /// call site can tell which way round the list means.
    ///
    /// [`Tables::excluding`]: export_config::Tables::excluding
    pub fn including<I, S>(tables: I) -> Self
    where
        I: IntoIterator<Item = S>,
        S: Into<String>,
    {
        Self {
            selection: Some(export_config::tables::Selection::Selected(
                export_config::SelectedTables {
                    tables: tables.into_iter().map(Into::into).collect(),
                },
            )),
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

#[cfg(test)]
mod tests {
    use crate::proto::rpc::v1::export_config;
    use prost::Message;

    /// `excluding` and `including` are exact opposites over the same input, so
    /// they must not be confusable.
    #[test]
    fn export_table_selection_distinguishes_including_from_excluding() {
        use export_config::tables::Selection;

        let excluded = export_config::Tables::excluding(["secrets", "audit"]);
        match &excluded.selection {
            Some(Selection::Excluded(tables)) => assert_eq!(tables.tables, ["secrets", "audit"]),
            other => panic!("expected Excluded, got {other:?}"),
        }

        let included = export_config::Tables::including(["secrets", "audit"]);
        assert!(matches!(included.selection, Some(Selection::Selected(_))));

        // The same table list, opposite meanings. If these ever compare equal,
        // one has been built with the wrong arm.
        assert_ne!(excluded, included);
    }

    /// The wire property the fail-closed rule in rpc.proto rests on.
    ///
    /// A `Tables` that is PRESENT with an undecodable `selection` must be
    /// distinguishable from `tables` being ABSENT. The first is "the client asked
    /// for something this server does not understand" and must be rejected; the
    /// second is "the client expressed no preference" and takes the server
    /// default. Were they identical on the wire, an old server could not tell an
    /// `excluded` request from no request at all, and would export the very
    /// tables the caller asked it to withhold.
    #[test]
    fn a_present_but_unrecognised_selection_is_not_an_absent_selection() {
        use crate::proto::rpc::v1::ExportConfig;

        // What an older server decodes an `excluded` selection into: the message
        // is present, the arm is not one it knows, so `selection` is None.
        let unrecognised = ExportConfig {
            tables: Some(export_config::Tables { selection: None }),
            ..Default::default()
        };
        // What "the client said nothing about tables" looks like.
        let absent = ExportConfig {
            tables: None,
            ..Default::default()
        };

        assert_ne!(
            unrecognised.encode_to_vec(),
            absent.encode_to_vec(),
            "an empty Tables must be distinguishable on the wire from no Tables, \
             or fail-closed handling is impossible"
        );

        let decoded = ExportConfig::decode(unrecognised.encode_to_vec().as_slice()).unwrap();
        let tables = decoded
            .tables
            .expect("the Tables message must survive as present");
        assert!(
            tables.selection.is_none(),
            "the unknown arm must read as an unset selection, which servers reject"
        );
        assert!(
            ExportConfig::decode(absent.encode_to_vec().as_slice())
                .unwrap()
                .tables
                .is_none()
        );
    }

    /// An `excluded` selection reaching a peer that predates the arm must land in
    /// unknown fields and leave `selection` unset -- not silently read as one of
    /// the three arms that already existed, and above all not as `All`.
    #[test]
    fn an_excluded_selection_does_not_decode_as_another_arm() {
        let excluded = export_config::Tables::excluding(["secrets"]);
        let bytes = excluded.encode_to_vec();

        // Round-trips exactly on a peer that knows the arm.
        assert_eq!(
            export_config::Tables::decode(bytes.as_slice()).unwrap(),
            excluded
        );

        // The whole payload is one length-delimited field at tag 4. A decoder
        // that predates the arm therefore finds nothing it recognises and leaves
        // `selection` unset, rather than mistaking it for `all`, `none` or
        // `selected` at tags 1 to 3.
        assert_eq!(bytes[0] >> 3, 4, "excluded must occupy tag 4");
        assert_eq!(bytes[0] & 0b111, 2, "and be length-delimited");
        let len = usize::from(bytes[1]);
        assert_eq!(
            bytes.len(),
            2 + len,
            "the tag-4 field must be the entire message"
        );
    }

    /// Refresh is scoped by the expired access token's claims, so the token RPCs
    /// must both carry an access token. Without it `RefreshTokens` cannot be
    /// implemented at all, which is why this is pinned rather than assumed.
    #[test]
    fn refresh_and_revoke_both_carry_an_access_token() {
        use crate::proto::rpc::v1::{RefreshTokensRequest, RevokeTokensRequest};

        let refresh = RefreshTokensRequest {
            refresh: "refresh-token".to_string(),
            access: "expired-access-token".to_string(),
            ..Default::default()
        };
        let decoded = RefreshTokensRequest::decode(refresh.encode_to_vec().as_slice()).unwrap();
        assert_eq!(decoded.access, "expired-access-token");
        assert_eq!(decoded.refresh, "refresh-token");

        // The asymmetry this removed: revoke already took both.
        let revoke = RevokeTokensRequest {
            access: "a".to_string(),
            refresh: "r".to_string(),
            ..Default::default()
        };
        let decoded = RevokeTokensRequest::decode(revoke.encode_to_vec().as_slice()).unwrap();
        assert_eq!(
            (decoded.access.as_str(), decoded.refresh.as_str()),
            ("a", "r")
        );
    }

    /// `refresh` must stay at tag 2. Retagging it to fold both tokens into a
    /// `Tokens` message would make an old client's refresh token arrive as a
    /// different field, which is why `access` was added at tag 3 instead.
    #[test]
    fn refresh_token_keeps_its_tag() {
        use crate::proto::rpc::v1::RefreshTokensRequest;

        let bytes = RefreshTokensRequest {
            refresh: "r".to_string(),
            ..Default::default()
        }
        .encode_to_vec();
        assert_eq!(bytes[0] >> 3, 2, "refresh must remain at tag 2");
    }

    /// Authenticate may rotate, and an unset `tokens` means "the presented token
    /// is still in effect" -- which a client must not confuse with an empty one.
    #[test]
    fn authenticate_response_reports_rotated_tokens() {
        use crate::proto::rpc::v1::{AuthenticateResponse, Tokens};
        use crate::proto::v1::Datetime;

        // The common case: no rotation, so no tokens field.
        let unchanged = AuthenticateResponse {
            expires_at: Some(Datetime::new(100, 0)),
            tokens: None,
        };
        let decoded = AuthenticateResponse::decode(unchanged.encode_to_vec().as_slice()).unwrap();
        assert!(
            decoded.tokens.is_none(),
            "absent tokens must not decode into an empty Tokens, which would \
             read as a rotation to an empty access token"
        );

        // The rotating case. `expires_at` is still populated for older clients,
        // and must agree with the tokens it accompanies.
        let rotated = AuthenticateResponse {
            expires_at: Some(Datetime::new(200, 0)),
            tokens: Some(Tokens {
                access: "new-access".to_string(),
                refresh: "new-refresh".to_string(),
                expires_at: Some(Datetime::new(200, 0)),
                refresh_expires_at: None,
            }),
        };
        let decoded = AuthenticateResponse::decode(rotated.encode_to_vec().as_slice()).unwrap();
        let tokens = decoded
            .tokens
            .expect("rotation must survive the round trip");
        assert_eq!(tokens.access, "new-access");
        assert_eq!(
            decoded.expires_at, tokens.expires_at,
            "expires_at must equal tokens.expires_at when tokens is set"
        );
    }
}
