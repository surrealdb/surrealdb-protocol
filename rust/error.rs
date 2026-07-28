//! Ergonomics for the structured error model.
//!
//! One [`SurrealError`] covers the whole protocol — transport failures,
//! per-statement query failures, and streaming-export failures — so callers
//! have one taxonomy to branch on. See `surrealdb/protocol/v1/error.proto`.

use std::fmt::Display;

use crate::proto::v1::{Duration, ErrorDetails, ErrorKind, RetryHint, SurrealError, Value};

impl SurrealError {
    /// Creates an error of the given kind.
    pub fn new(kind: ErrorKind, message: impl Into<String>) -> Self {
        Self {
            kind: kind as i32,
            message: message.into(),
            code: 0,
            details: None,
            cause: None,
            retry: None,
        }
    }

    /// Returns the error's kind, resolving anything unrecognised to
    /// [`ErrorKind::Internal`].
    ///
    /// Prefer this over the generated `kind()` accessor, which maps both an
    /// unset kind and a kind introduced by a newer server to `Unspecified`.
    /// "No error kind" is not a useful thing to branch on; degrading to
    /// `Internal` matches the server's own `#[surreal(other)] Internal`
    /// catch-all, so a client meeting a future kind still behaves sensibly.
    pub fn kind_or_internal(&self) -> ErrorKind {
        match ErrorKind::try_from(self.kind) {
            Ok(ErrorKind::Unspecified) | Err(_) => ErrorKind::Internal,
            Ok(kind) => kind,
        }
    }

    /// Sets the legacy JSON-RPC numeric code.
    pub fn with_code(mut self, code: i64) -> Self {
        self.code = code;
        self
    }

    /// Attaches the specific reason and its payload.
    pub fn with_details(mut self, kind: impl Into<String>, content: Option<Value>) -> Self {
        self.details = Some(ErrorDetails {
            kind: kind.into(),
            content,
        });
        self
    }

    /// Attaches the error that caused this one.
    pub fn with_cause(mut self, cause: SurrealError) -> Self {
        self.cause = Some(Box::new(cause));
        self
    }

    /// Marks the failure as transient, optionally suggesting how long to wait.
    pub fn with_retry(mut self, after: Option<Duration>) -> Self {
        self.retry = Some(RetryHint { after });
        self
    }

    /// Returns `true` when the operation may be retried.
    ///
    /// Branch on this rather than on [`SurrealError::message`] or the legacy
    /// [`SurrealError::code`]; it is the only representation of retryability
    /// that is part of the contract.
    pub fn is_retryable(&self) -> bool {
        self.retry.is_some()
    }

    /// The specific reason the server supplied, if any — for example
    /// `"TransactionConflict"`, `"TimedOut"` or `"Auth"`.
    ///
    /// Named to distinguish it from the top-level [`SurrealError::kind_or_internal`];
    /// on the wire both are spelled `kind`, one nested inside the other.
    pub fn detail_kind(&self) -> Option<&str> {
        self.details.as_ref().map(|details| details.kind.as_str())
    }

    /// Iterates the error chain, starting with this error.
    pub fn chain(&self) -> impl Iterator<Item = &SurrealError> {
        std::iter::successors(Some(self), |error| error.cause.as_deref())
    }
}

impl Display for SurrealError {
    /// Renders the message, its reason when present, and the whole cause
    /// chain, so a single `{}` gives the full picture in a log line.
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self.kind_or_internal())?;
        if let Some(reason) = self.detail_kind().filter(|reason| !reason.is_empty()) {
            write!(f, "/{reason}")?;
        }
        write!(f, ": {}", self.message)?;
        for cause in self.chain().skip(1) {
            write!(f, ": {}", cause.message)?;
        }
        Ok(())
    }
}

impl std::error::Error for SurrealError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        self.cause
            .as_deref()
            .map(|cause| cause as &(dyn std::error::Error + 'static))
    }
}

#[cfg(test)]
mod tests {
    use prost::Message;

    use super::*;

    /// The taxonomy must stay identical to `ErrorDetails` in the server's
    /// surrealdb-types crate: same variants, same order, same names.
    ///
    /// Verified against surrealdb-private#642, the crate split that gave
    /// fourteen layers their own error types. That PR leaves
    /// `surrealdb/types/src/error.rs` byte-identical, and ten of these eleven
    /// appear in its 250-row wire snapshot -- `Context` does not, because it
    /// only ever wraps another error rather than being raised alone.
    ///
    /// A server-side rename or reorder will not fail anything else here, so
    /// this list is the guard.
    #[test]
    fn kind_taxonomy_matches_the_server() {
        let expected = [
            (ErrorKind::Validation, 1, "Validation"),
            (ErrorKind::Configuration, 2, "Configuration"),
            (ErrorKind::Query, 3, "Query"),
            (ErrorKind::Serialization, 4, "Serialization"),
            (ErrorKind::NotAllowed, 5, "NotAllowed"),
            (ErrorKind::NotFound, 6, "NotFound"),
            (ErrorKind::AlreadyExists, 7, "AlreadyExists"),
            (ErrorKind::Connection, 8, "Connection"),
            (ErrorKind::Thrown, 9, "Thrown"),
            (ErrorKind::Internal, 10, "Internal"),
            (ErrorKind::Context, 11, "Context"),
        ];

        for (kind, number, server_name) in expected {
            assert_eq!(kind as i32, number, "{server_name} changed tag");
            // The proto spelling is the server's name upper-snake-cased.
            let mut snake = String::new();
            for (index, ch) in server_name.char_indices() {
                if ch.is_uppercase() && index > 0 {
                    snake.push('_');
                }
                snake.push(ch.to_ascii_uppercase());
            }
            assert_eq!(kind.as_str_name(), format!("ERROR_KIND_{snake}"));
        }

        // Nothing beyond the eleven, plus the zero value.
        assert!(ErrorKind::try_from(12).is_err(), "a 12th kind appeared");
    }

    #[test]
    fn unknown_kind_degrades_to_internal() {
        // A kind a newer server introduced.
        let error = SurrealError {
            kind: 9999,
            ..SurrealError::new(ErrorKind::Query, "from the future")
        };
        assert_eq!(error.kind_or_internal(), ErrorKind::Internal);

        // As does an unset kind: "no kind" is not a useful behavioural answer.
        let unspecified = SurrealError {
            kind: ErrorKind::Unspecified as i32,
            ..SurrealError::new(ErrorKind::Query, "")
        };
        assert_eq!(unspecified.kind_or_internal(), ErrorKind::Internal);
    }

    /// A transaction conflict must be detectable structurally, without
    /// matching on the message or on the legacy numeric code.
    #[test]
    fn transaction_conflict_is_structurally_retryable() {
        let error = SurrealError::new(ErrorKind::Query, "transaction conflict")
            .with_code(-32009)
            .with_details("TransactionConflict", None)
            .with_retry(Some(Duration::new(0, 50_000_000)));

        assert!(error.is_retryable());
        assert_eq!(error.detail_kind(), Some("TransactionConflict"));
        assert_eq!(error.kind_or_internal(), ErrorKind::Query);

        // Survives the wire.
        let decoded = SurrealError::decode(error.encode_to_vec().as_slice()).unwrap();
        assert!(decoded.is_retryable());
        assert_eq!(decoded.detail_kind(), Some("TransactionConflict"));

        // And a non-retryable error is not merely "unset" -- absence is the
        // signal, so it must read as not retryable.
        let fatal = SurrealError::new(ErrorKind::NotAllowed, "nope");
        assert!(!fatal.is_retryable());
    }

    #[test]
    fn cause_chain_round_trips_and_is_walkable() {
        let error = SurrealError::new(ErrorKind::Query, "outer").with_cause(
            SurrealError::new(ErrorKind::Context, "middle")
                .with_cause(SurrealError::new(ErrorKind::Internal, "inner")),
        );

        let decoded = SurrealError::decode(error.encode_to_vec().as_slice()).unwrap();
        let messages: Vec<_> = decoded.chain().map(|e| e.message.as_str()).collect();
        assert_eq!(messages, vec!["outer", "middle", "inner"]);
        assert_eq!(decoded.to_string(), "Query: outer: middle: inner");

        // The chain is reachable through std::error::Error too.
        let source = std::error::Error::source(&decoded).unwrap();
        assert_eq!(source.to_string(), "Context: middle: inner");
    }
}
