//! SurrealDB Protocol

mod proto {
    #![allow(missing_docs)]

    include!(concat!(env!("OUT_DIR"), "/surrealdb.protocol.rs"));

    pub mod rpc {
        include!(concat!(env!("OUT_DIR"), "/surrealdb.protocol.rpc.rs"));
    }
}

pub use proto::*;

#[cfg(test)]
mod tests {
    use super::*;

    use rstest::rstest;

    #[rstest]
    #[case(Value::default(), "surrealdb.protocol.Value")]
    #[case(rpc::QueryRequest::default(), "surrealdb.protocol.rpc.QueryRequest")]
    fn test_type_names<T: prost::Name>(#[case] _proto: T, #[case] expected: &str) {
        assert_eq!(T::full_name(), expected);
    }
}
