//! Fully-qualified `SurrealDBService` method names, as they appear in
//! [`ServerCapabilities::denied_methods`].
//!
//! These exist so that a client honouring an operator's per-method deny list
//! never compares against a hand-written string literal. The names are the
//! generated gRPC method paths, so renaming an RPC -- or the service -- moves
//! what the server emits. A client with its own copy of the old literal then
//! matches nothing, silently stops honouring the denial, and nothing fails to
//! compile. `v1` is unstable and still permits such renames, so this is a live
//! hazard rather than a hypothetical one.
//!
//! Constants alone would not prevent the drift, only relocate it, so
//! [`ALL`] is checked against the paths in the generated tonic client at compile
//! time by the test at the bottom of this file. Renaming an RPC without
//! updating this module fails `cargo test` with a diff of the two sets.
//!
//! # Form
//!
//! These are the DENY-LIST form: `<package>.<Service>/<Method>`, with no leading
//! slash, which is what a server puts in `denied_methods`. The gRPC path used on
//! the wire is the same string prefixed with `/`, which is why comparing a
//! `denied_methods` entry against `tonic`'s own path constant fails on every
//! method. Use [`grpc_path`] when the slash-prefixed form is wanted.
//!
//! [`ServerCapabilities::denied_methods`]: crate::proto::rpc::v1::ServerCapabilities::denied_methods

/// The fully-qualified service name.
pub const SERVICE: &str = "surrealdb.protocol.rpc.v1.SurrealDBService";

macro_rules! methods {
    ($($konst:ident => $method:literal),* $(,)?) => {
        $(
            #[doc = concat!("`", $method, "`, as it appears in `denied_methods`.")]
            pub const $konst: &str = concat!(
                "surrealdb.protocol.rpc.v1.SurrealDBService/", $method
            );
        )*

        /// Every method name, in the order the service declares them.
        ///
        /// Checked against the generated tonic client, so this is the whole
        /// service and not merely the part someone remembered to add.
        pub const ALL: &[&str] = &[$($konst),*];
    };
}

methods! {
    // Negotiation.
    GET_CAPABILITIES => "GetCapabilities",
    HEALTH => "Health",
    // Sessions.
    ATTACH_SESSION => "AttachSession",
    DETACH_SESSION => "DetachSession",
    RESET_SESSION => "ResetSession",
    // Session context.
    USE => "Use",
    SET_VARIABLE => "SetVariable",
    UNSET_VARIABLE => "UnsetVariable",
    // Authentication.
    SIGNUP => "Signup",
    SIGNIN => "Signin",
    AUTHENTICATE => "Authenticate",
    REFRESH_TOKENS => "RefreshTokens",
    REVOKE_TOKENS => "RevokeTokens",
    INVALIDATE => "Invalidate",
    // Transactions.
    BEGIN_TRANSACTION => "BeginTransaction",
    COMMIT_TRANSACTION => "CommitTransaction",
    CANCEL_TRANSACTION => "CancelTransaction",
    // Query.
    QUERY => "Query",
    RUN => "Run",
    KILL => "Kill",
    // Live queries.
    SUBSCRIBE => "Subscribe",
    // Import and export.
    IMPORT_SURQL => "ImportSurql",
    EXPORT_SURQL => "ExportSurql",
    EXPORT_DIRECTORY => "ExportDirectory",
    EXPORT_ML_MODEL => "ExportMlModel",
    IMPORT_ML_MODEL => "ImportMlModel",
}

/// Returns the wire gRPC path for a method name, i.e. `name` with a leading `/`.
///
/// `denied_methods` carries the unprefixed form and gRPC uses the prefixed one;
/// this is the one-line conversion between them, provided so that callers do not
/// each reinvent it and get the slash wrong in a different direction.
pub fn grpc_path(name: &str) -> String {
    format!("/{name}")
}

/// A `Version` deny-list entry, which names no RPC.
///
/// There is no `Version` method: the build version is reported by
/// `ServerCapabilities.server_version`, and an operator who denies `version`
/// makes the server withhold that field and list this here instead. It is
/// therefore absent from [`ALL`] by design, and is the reason clients must
/// tolerate a `denied_methods` entry that matches no method they know.
pub const VERSION_PSEUDO_METHOD: &str = "Version";

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeSet;

    /// The generated tonic client, read at compile time so this test cannot go
    /// looking for a file that is not where it expected.
    const TONIC: &str = include_str!(
        "../gen/rust/proto/surrealdb/protocol/rpc/v1/surrealdb.protocol.rpc.v1.tonic.rs"
    );

    /// Every `"/surrealdb.protocol.rpc.v1.SurrealDBService/Method"` literal in
    /// the generated client.
    fn generated_paths() -> BTreeSet<String> {
        let needle = format!("\"/{SERVICE}/");
        TONIC
            .match_indices(&needle)
            .map(|(at, _)| {
                let rest = &TONIC[at + 1..];
                let end = rest.find('"').expect("an opened literal must close");
                rest[..end].to_string()
            })
            .collect()
    }

    /// The load-bearing assertion of this module.
    ///
    /// If an RPC is added, removed or renamed and `ALL` is not updated to match,
    /// this fails. Without it the constants are just a second place for the same
    /// stale literal to live.
    #[test]
    fn all_matches_the_generated_service() {
        let generated = generated_paths();
        assert!(
            !generated.is_empty(),
            "no method paths found in the generated tonic client; \
             the extraction below has stopped matching what the generator emits"
        );

        let declared: BTreeSet<String> = ALL.iter().map(|name| grpc_path(name)).collect();

        let missing: Vec<_> = generated.difference(&declared).collect();
        let extra: Vec<_> = declared.difference(&generated).collect();
        assert!(
            missing.is_empty() && extra.is_empty(),
            "method names have drifted from the generated service.\n\
             in the service but not in ALL: {missing:?}\n\
             in ALL but not in the service: {extra:?}"
        );
    }

    /// The count is pinned separately so that a *pair* of compensating edits --
    /// one method renamed to another's name -- cannot pass the set comparison.
    #[test]
    fn all_has_no_duplicates() {
        let unique: BTreeSet<_> = ALL.iter().collect();
        assert_eq!(unique.len(), ALL.len(), "ALL contains a duplicate");
    }

    /// The deny-list form has no leading slash and the gRPC path does. Getting
    /// this backwards is the exact bug the constants exist to prevent, so it is
    /// pinned rather than left to the doc comment.
    #[test]
    fn deny_list_form_is_unprefixed() {
        assert_eq!(
            EXPORT_SURQL,
            "surrealdb.protocol.rpc.v1.SurrealDBService/ExportSurql"
        );
        assert!(
            !EXPORT_SURQL.starts_with('/'),
            "deny-list entries carry no slash"
        );
        assert_eq!(
            grpc_path(EXPORT_SURQL),
            "/surrealdb.protocol.rpc.v1.SurrealDBService/ExportSurql"
        );
    }

    /// `Version` is deliberately not a method, and must not creep into `ALL`.
    #[test]
    fn version_is_not_a_method() {
        assert!(
            !ALL.iter().any(|name| name.ends_with("/Version")),
            "Version is reported through server_version, not as an RPC"
        );
    }
}
