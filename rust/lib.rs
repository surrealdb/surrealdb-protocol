//! SurrealDB Protobuf and gRPC protocol.
//!
//! All common protobuf messages are defined in the `v1` module.
//! The `rpc` module contains the gRPC messages.

#[cfg(feature = "proto")]
pub mod proto {
    //! Protobuf generated code.

    mod generated {
        #![allow(missing_docs, clippy::allow_attributes)]

        pub mod surrealdb {
            pub mod protocol {
                pub mod v1 {
                    include!("../gen/rust/proto/surrealdb.protocol.v1.rs");
                }

                #[cfg(feature = "rpc")]
                pub mod rpc {
                    pub mod v1 {
                        include!("../gen/rust/proto/surrealdb.protocol.rpc.v1.rs");
                    }
                }
            }
        }
    }

    pub use generated::surrealdb::protocol::*;
}

#[cfg(feature = "flatbuffers")]
pub mod fb {
    //! Flatbuffers generated code.

    mod generated {
        #![allow(
            clippy::allow_attributes,
            clippy::extra_unused_lifetimes,
            clippy::missing_safety_doc,
            clippy::needless_lifetimes,
            missing_docs,
            unsafe_op_in_unsafe_fn,
            unused_imports
        )]
        include!("../gen/rust/fb/mod.rs");
    }

    pub use generated::surrealdb::protocol::v_1 as v1;
}

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
