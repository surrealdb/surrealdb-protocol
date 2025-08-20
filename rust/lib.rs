#![doc = include_str!("../README.md")]

mod convert;
mod methods;

pub use convert::{TryFromValue, TryIntoValue};

#[cfg(feature = "rpc")]
mod rpc_methods;

#[cfg(feature = "rpc")]
pub use rpc_methods::{QueryResponseValueStream, TryFromQueryStream};

#[cfg(feature = "proto")]
pub mod proto {
    //! Protobuf generated code.

    pub use prost_types;

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

mod serde_timestamp {
    use prost_types::Timestamp;
    use serde::Deserializer;
    use serde::Serializer;
    use serde::{Deserialize, Serialize};

    pub fn serialize<S>(timestamp: &Timestamp, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        // Convert to RFC3339 string format
        let seconds = timestamp.seconds;
        let nanos = timestamp.nanos;

        // Create a DateTime-like string representation
        let dt = chrono::DateTime::from_timestamp(seconds, nanos as u32)
            .ok_or_else(|| serde::ser::Error::custom("Invalid timestamp"))?;

        dt.to_rfc3339().serialize(serializer)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Timestamp, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;

        // Parse RFC3339 string back to timestamp
        let dt = chrono::DateTime::parse_from_rfc3339(&s).map_err(serde::de::Error::custom)?;

        Ok(Timestamp {
            seconds: dt.timestamp(),
            nanos: dt.timestamp_subsec_nanos() as i32,
        })
    }
}

mod serde_duration {
    use prost_types::Duration;
    use serde::Deserializer;

    use serde::{Deserialize, Serialize};

    pub fn serialize<S>(duration: &Duration, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let duration = std::time::Duration::from_secs(duration.seconds as u64)
            + std::time::Duration::from_nanos(duration.nanos as u64);
        duration.serialize(serializer)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Duration, D::Error>
    where
        D: Deserializer<'de>,
    {
        let duration = std::time::Duration::deserialize(deserializer)?;

        Ok(Duration {
            seconds: duration.as_secs() as i64,
            nanos: duration.subsec_nanos() as i32,
        })
    }
}

mod serde_duration_optional {
    use prost_types::Duration;
    use serde::{Deserializer, Serializer};

    pub fn serialize<S>(duration: &Option<Duration>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match duration {
            Some(duration) => crate::serde_duration::serialize(duration, serializer),
            None => serializer.serialize_none(),
        }
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Option<Duration>, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct Visitor;

        impl serde::de::Visitor<'_> for Visitor {
            type Value = Option<Duration>;

            fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
                formatter.write_str("a duration or null")
            }
        }

        deserializer.deserialize_option(Visitor)
    }
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use super::*;

    use crate::proto::v1::{Array, Decimal, File, Geometry, Object, Point, RecordId, Uuid, Value};
    use crate::proto::v1::{Line, MultiPolygon, Polygon};
    use assert_json_diff::assert_json_eq;
    use bytes::Bytes;
    use prost_types::{Duration, Timestamp};

    use rstest::rstest;
    use serde_json::json;

    #[rstest]
    #[case(Value::default(), "surrealdb.protocol.v1.Value")]
    #[case(
        proto::rpc::v1::QueryRequest::default(),
        "surrealdb.protocol.rpc.v1.QueryRequest"
    )]
    fn test_type_names<T: prost::Name>(#[case] _proto: T, #[case] expected: &str) {
        assert_eq!(T::full_name(), expected);
    }

    #[rstest]
    #[case(Value::null(), json!({"Null":{}}))]
    #[case(Value::bool(true), json!({"Bool":true}))]
    #[case(Value::int64(1), json!({"Int64":1}))]
    #[case(Value::uint64(1), json!({"Uint64":1}))]
    #[case(Value::float64(1.0), json!({"Float64":1.0}))]
    #[case(Value::string("test".to_string()), json!({"String":"test"}))]
    #[case(Value::bytes(Bytes::from_static(b"test")), json!({"Bytes":[116,101,115,116]}))]
    #[case(Value::decimal(Decimal::new("1".to_string())), json!({"Decimal":{"value":"1"}}))]
    #[case(Value::duration(Duration {
        seconds: 1,
        nanos: 0,
    }), json!({
        "Duration": {
            "secs":1,
            "nanos":0
        }
    }))]
    #[case(Value::datetime(Timestamp {
        seconds: 1,
        nanos: 0,
    }), json!({"Datetime":"1970-01-01T00:00:01+00:00"}))]
    #[case(Value::uuid(Uuid::new("00000000-0000-0000-0000-000000000000".to_string())), json!({"Uuid":{"value":"00000000-0000-0000-0000-000000000000"}}))]
    #[case(Value::array(Array::new(vec![Value::null()])), json!({"Array":{
        "values": [{"Null":{}}]
    }}))]
    #[case(Value::object(Object::new(BTreeMap::from([("test".to_string(), Value::null())]))), json!({"Object":{
        "test": {"Null":{}}
    }}))]
    #[case(Value::geometry(Geometry::point(Point::new(1., 2.))), json!({"Geometry": {
        "Point": {
            "x":1.0,
            "y":2.0
        }
    }}))]
    #[case(Value::geometry(Geometry::line(Line::new(vec![Point::new(1., 2.), Point::new(3., 4.)]))), json!({"Geometry":{"Line":{"points":[{"x":1.0,"y":2.0},{"x":3.0,"y":4.0}]}}}))]
    #[case(Value::geometry(Geometry::polygon(Polygon::new(
        Line::new(vec![Point::new(1., 2.), Point::new(3., 4.)]),
        vec![Line::new(vec![Point::new(5., 6.), Point::new(7., 8.)])]
    ))), json!({"Geometry": {
        "Polygon": {
            "exterior": {
                "points": [
                    {"x":1.0,"y":2.0},
                    {"x":3.0,"y":4.0}
                ]
            },
            "interiors": [{"points":[{"x":5.0,"y":6.0},{"x":7.0,"y":8.0}]}]
        }
    }}))]
    #[case(Value::geometry(Geometry::multi_polygon(MultiPolygon::new(vec![
        Polygon::new(
            Line::new(vec![Point::new(1., 2.), Point::new(3., 4.)]),
            vec![Line::new(vec![Point::new(5., 6.), Point::new(7., 8.)])]
        ),
        Polygon::new(
            Line::new(vec![Point::new(9., 10.), Point::new(11., 12.)]),
            vec![Line::new(vec![Point::new(13., 14.), Point::new(15., 16.)])]
    )]))), json!({"Geometry": {
        "MultiPolygon": {
            "polygons": [
                {
                    "exterior": {
                        "points": [
                            {"x":1.0,"y":2.0},
                            {"x":3.0,"y":4.0}
                        ],
                    },
                    "interiors": [
                        {"points":[{"x":5.0,"y":6.0},{"x":7.0,"y":8.0}]}
                    ]
                },
                {
                    "exterior": {
                        "points": [
                            {"x":9.0,"y":10.0},
                            {"x":11.0,"y":12.0}
                        ],
                    },
                    "interiors": [
                        {"points":[{"x":13.0,"y":14.0},{"x":15.0,"y":16.0}]}
                    ]
                }
            ]
        }
    }}))]
    #[case(Value::record_id(RecordId::new("test".to_string(), None)), json!({"RecordId":{"table":"test","id":null}}))]
    #[case(Value::file(File::new("test".to_string(), "test".to_string())), json!({"File":{"bucket":"test","key":"test"}}))]
    fn test_serde(#[case] value: Value, #[case] expected: serde_json::Value) {
        let serialized = serde_json::to_value(&value).unwrap();
        assert_json_eq!(serialized, expected);
    }
}
