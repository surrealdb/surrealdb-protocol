#![doc = include_str!("../README.md")]

#[cfg(feature = "proto")]
mod convert;
#[cfg(feature = "proto")]
mod error;
#[cfg(feature = "proto")]
mod methods;

#[cfg(feature = "proto")]
pub use convert::{TryFromValue, TryIntoValue};

#[cfg(feature = "rpc")]
mod export;
#[cfg(feature = "rpc")]
mod rpc_methods;

#[cfg(feature = "rpc")]
pub use export::{DEFAULT_FILE_CHUNK_SIZE, MAX_FILE_CHUNK_SIZE};
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
                    include!("../gen/rust/proto/surrealdb/protocol/v1/surrealdb.protocol.v1.rs");
                }

                #[cfg(feature = "rpc")]
                pub mod rpc {
                    pub mod v1 {
                        include!(
                            "../gen/rust/proto/surrealdb/protocol/rpc/v1/surrealdb.protocol.rpc.v1.rs"
                        );
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

#[cfg(feature = "proto")]
mod serde_key_values {
    //! Serialises a `repeated KeyValue` as a JSON object.
    //!
    //! `Object` and `Variables` carry a list of key/value pairs on the wire
    //! (see the note on `Object` in value.proto) but are conceptually maps, so
    //! their JSON form stays a map. This keeps the JSON representation stable
    //! across the map-to-repeated encoding change, and is what lets
    //! `#[serde(flatten)]` apply to the field at all — flatten requires a
    //! map-shaped value.

    use std::collections::BTreeMap;

    use serde::Deserialize;
    use serde::de::{Deserializer, Error as _};
    use serde::ser::{SerializeMap, Serializer};

    use crate::proto::v1::{KeyValue, Value};

    pub fn serialize<S>(entries: &[KeyValue], serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut map = serializer.serialize_map(Some(entries.len()))?;
        for entry in entries {
            // A missing value is a protocol error, but Serialize cannot fail
            // usefully here; an unset Value round-trips as the unset variant,
            // which decoders already reject.
            map.serialize_entry(&entry.key, &entry.value.clone().unwrap_or_default())?;
        }
        map.end()
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Vec<KeyValue>, D::Error>
    where
        D: Deserializer<'de>,
    {
        // Collect through a BTreeMap so the result is in ascending key order
        // and duplicate keys cannot survive, matching the wire contract.
        let map = BTreeMap::<String, Value>::deserialize(deserializer)?;
        map.into_iter()
            .map(|(key, value)| {
                if key.is_empty() {
                    return Err(D::Error::custom("empty key"));
                }
                Ok(KeyValue {
                    key,
                    value: Some(value),
                })
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use super::*;

    use crate::proto::v1::{
        Array, Datetime, Decimal, Duration, File, Geometry, KeyValue, Object, Point, RecordId,
        Uuid, Value,
    };
    use crate::proto::v1::{Line, MultiPolygon, Polygon};
    use assert_json_diff::assert_json_eq;
    use bytes::Bytes;

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
    #[case(Value::float64(1.0), json!({"Float64":1.0}))]
    #[case(Value::string("test".to_string()), json!({"String":"test"}))]
    #[case(Value::bytes(Bytes::from_static(b"test")), json!({"Bytes":[116,101,115,116]}))]
    #[case(Value::decimal(Decimal::new("1".to_string())), json!({"Decimal":{"value":"1"}}))]
    #[case(Value::duration(Duration::new(1, 0)), json!({
        "Duration": {
            "seconds":1,
            "nanos":0
        }
    }))]
    #[case(Value::datetime(Datetime::new(1, 0)), json!({
        "Datetime": {
            "seconds":1,
            "nanos":0
        }
    }))]
    #[case(Value::uuid(Uuid::new([0; 16])), json!({"Uuid":{"bytes":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}}))]
    #[case(Value::none(), json!({"None":{}}))]
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

    fn hex(bytes: &[u8]) -> String {
        bytes.iter().map(|b| format!("{b:02x}")).collect()
    }

    /// `NONE`, `NULL`, and an absent key are three distinct states, and all
    /// three must survive an encode/decode round trip.
    ///
    /// This is a regression test for a silent, one-directional data-loss bug.
    /// When `Object` was a `map<string, Value>`, prost omitted an entry whose
    /// value equalled the default — and `Value::default()` was `NONE`, because
    /// `NONE` was "unset oneof" rather than a variant. ts-proto's decoder then
    /// dropped the whole entry, so `{"k": NONE}` encoded in Rust arrived in
    /// TypeScript as `{}`. The fixes are an explicit `NoneValue` variant and
    /// `repeated KeyValue` instead of a map; this test pins both.
    #[test]
    fn none_null_and_absent_are_distinct_across_encoding() {
        use prost::Message;

        let none = Object::new(BTreeMap::from([("k".to_string(), Value::none())]));
        let null = Object::new(BTreeMap::from([("k".to_string(), Value::null())]));
        let absent = Object::new(BTreeMap::new());

        // Distinct before encoding.
        assert_ne!(none, null);
        assert_ne!(none, absent);
        assert_ne!(null, absent);

        // The load-bearing assertion. An entry whose value is NONE must encode
        // differently from an entry whose value field is absent. Under the old
        // schema these were byte-identical, because NONE was "unset oneof" and
        // therefore equal to `Value::default()`, which prost omits. Rust
        // decoded that back to NONE and looked fine; TypeScript saw a missing
        // value field and dropped the key. Pinning this here is what makes the
        // bug unrepresentable rather than merely fixed.
        let entry_with_none = KeyValue::new("k", Value::none()).encode_to_vec();
        let entry_with_absent_value = KeyValue {
            key: "k".to_string(),
            value: None,
        }
        .encode_to_vec();
        assert_ne!(
            entry_with_none, entry_with_absent_value,
            "NONE must be distinguishable on the wire from a missing value"
        );

        // The exact bytes, shared with the TypeScript test in
        // typescript/parity.test.ts so both languages are pinned to one
        // encoding rather than merely to their own round trip.
        //
        //   0a 08              items, length 8
        //     0a 01 6b           key = "k"
        //     12 03              value, length 3
        //       aa 01 00           field 21 (none), length 0
        //
        // Under the old schema this was `0a 03 0a 01 6b` -- the key with no
        // value field at all, which is what TypeScript then discarded.
        let none_bytes = none.encode_to_vec();
        assert_eq!(hex(&none_bytes), "0a080a016b1203aa0100");
        assert_eq!(hex(&null.encode_to_vec()), "0a070a016b12020a00");
        assert_eq!(hex(&absent.encode_to_vec()), "");

        // And distinct after a round trip.
        let none_decoded = Object::decode(none_bytes.as_slice()).unwrap();
        let null_decoded = Object::decode(null.encode_to_vec().as_slice()).unwrap();
        let absent_decoded = Object::decode(absent.encode_to_vec().as_slice()).unwrap();

        assert_eq!(none_decoded, none);
        assert_eq!(null_decoded, null);
        assert_eq!(absent_decoded, absent);
        assert_ne!(none_decoded, null_decoded);
        assert_ne!(none_decoded, absent_decoded);

        // The key is present and holds NONE -- not missing, and not NULL.
        let value = none_decoded.get("k").expect("key must survive");
        assert!(value.is_none(), "expected NONE, got {value:?}");
        assert!(!value.is_null());
        assert!(!value.is_unset());
        assert!(absent_decoded.get("k").is_none());
    }

    /// An unset variant means "unknown variant from a newer peer", and must
    /// never be confused with `NONE`.
    #[test]
    fn unset_variant_is_not_none() {
        let unset = Value::unset();
        assert!(unset.is_unset());
        assert!(!unset.is_none(), "an unset oneof must not read as NONE");
        assert_ne!(unset, Value::none());
    }

    /// The native temporal types must carry SurrealDB's full range. The
    /// well-known types they replaced capped at ~10,000 years (Duration) and
    /// year 9999 (Timestamp), silently truncating anything larger.
    #[test]
    fn temporal_types_survive_the_full_surrealdb_range() {
        use prost::Message;

        let duration = Value::duration(Duration::new(u64::MAX, 999_999_999));
        let decoded = Value::decode(duration.encode_to_vec().as_slice()).unwrap();
        assert_eq!(decoded, duration);

        // Comfortably past year 9999 in both directions.
        for seconds in [-8_000_000_000_000_i64, 8_000_000_000_000_i64] {
            let datetime = Value::datetime(Datetime::new(seconds, 999_999_999));
            let decoded = Value::decode(datetime.encode_to_vec().as_slice()).unwrap();
            assert_eq!(decoded, datetime);
        }
    }

    /// UUIDs are 16 raw bytes on the wire and must round-trip exactly.
    #[test]
    fn uuid_round_trips_as_sixteen_bytes() {
        let source = uuid::Uuid::parse_str("0191b3f0-1c2d-7e3f-8a4b-5c6d7e8f9a0b").unwrap();
        let proto = Uuid::from_uuid(source);
        assert_eq!(proto.bytes.len(), 16);
        assert_eq!(proto.to_uuid().unwrap(), source);
        assert_eq!(proto.to_string(), source.to_string());

        // Anything that is not exactly 16 bytes is rejected rather than padded.
        let malformed = Uuid {
            bytes: Bytes::from_static(b"short"),
        };
        assert!(malformed.to_uuid().is_err());
    }
}
