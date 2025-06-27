//! SurrealDB Protocol

mod v1 {
    #![allow(missing_docs)]

    include!("../../gen/rust/surrealdb.protocol.v1.rs");

    pub mod rpc {
        include!("../../gen/rust/surrealdb.protocol.rpc.v1.rs");
    }
}

pub use v1::*;

#[cfg(test)]
mod tests {
    use super::*;

    use rstest::rstest;

    #[rstest]
    #[case(Value::default(), "surrealdb.protocol.v1.Value")]
    #[case(rpc::QueryRequest::default(), "surrealdb.protocol.rpc.v1.QueryRequest")]
    fn test_type_names<T: prost::Name>(#[case] _proto: T, #[case] expected: &str) {
        assert_eq!(T::full_name(), expected);
    }
}
