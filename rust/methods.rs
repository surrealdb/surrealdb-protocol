use crate::proto::v1::geometry::Geometry as GeometryEnum;
use crate::proto::v1::{
    Array, Datetime, Decimal, Duration, File, Geometry, GeometryCollection, KeyValue, NoneValue,
    NullValue, Object, RecordId, RecordIdKey, Set, Uuid, Value,
};
use crate::proto::v1::{Line, MultiLine, MultiPoint, MultiPolygon, Point, Polygon};

use crate::proto::v1::value::Value as ValueEnum;
use bytes::Bytes;
use std::collections::BTreeMap;
use std::fmt::Display;

impl Value {
    /// Creates a new `Value` holding SurrealDB's `NONE`.
    ///
    /// `NONE` is an explicit variant on the wire, distinct from `NULL` and from
    /// an absent object key. It is deliberately not the `Default`: an unset
    /// oneof means "unknown variant from a newer peer", which callers must
    /// reject rather than silently read as `NONE`.
    pub fn none() -> Self {
        Self {
            value: Some(ValueEnum::None(NoneValue::default())),
        }
    }

    /// Returns a `Value` whose variant is unset.
    ///
    /// This is not `NONE` — it is what a decoder produces for a variant it does
    /// not recognise. Only useful for constructing that case in tests.
    pub fn unset() -> Self {
        Self { value: None }
    }

    /// Creates a new `Value` with a `Null` value.
    pub fn null() -> Self {
        Self {
            value: Some(ValueEnum::Null(NullValue::default())),
        }
    }

    /// Creates a new `Value` with a `Bool` value.
    pub fn bool(value: bool) -> Self {
        Self {
            value: Some(ValueEnum::Bool(value)),
        }
    }

    /// Creates a new `Value` with a `Int64` value.
    pub fn int64(value: i64) -> Self {
        Self {
            value: Some(ValueEnum::Int64(value)),
        }
    }

    /// Creates a new `Value` with a `Float64` value.
    pub fn float64(value: f64) -> Self {
        Self {
            value: Some(ValueEnum::Float64(value)),
        }
    }

    /// Creates a new `Value` with a `String` value.
    pub fn string(value: String) -> Self {
        Self {
            value: Some(ValueEnum::String(value)),
        }
    }

    /// Creates a new `Value` with a `Bytes` value.
    pub fn bytes(value: Bytes) -> Self {
        Self {
            value: Some(ValueEnum::Bytes(value)),
        }
    }

    /// Creates a new `Value` with a `Decimal` value.
    pub fn decimal(value: Decimal) -> Self {
        Self {
            value: Some(ValueEnum::Decimal(value)),
        }
    }

    /// Creates a new `Value` with a `Duration` value.
    pub fn duration(value: Duration) -> Self {
        Self {
            value: Some(ValueEnum::Duration(value)),
        }
    }

    /// Creates a new `Value` with a `Datetime` value.
    pub fn datetime(value: Datetime) -> Self {
        Self {
            value: Some(ValueEnum::Datetime(value)),
        }
    }

    /// Creates a new `Value` with a `Uuid` value.
    pub fn uuid(value: Uuid) -> Self {
        Self {
            value: Some(ValueEnum::Uuid(value)),
        }
    }

    /// Creates a new `Value` with a `Array` value.
    pub fn array(value: Array) -> Self {
        Self {
            value: Some(ValueEnum::Array(value)),
        }
    }

    /// Creates a new `Value` with a `Object` value.
    pub fn object(value: Object) -> Self {
        Self {
            value: Some(ValueEnum::Object(value)),
        }
    }

    /// Creates a new `Value` with a `Regex` value.
    pub fn regex(value: String) -> Self {
        Self {
            value: Some(ValueEnum::Regex(value)),
        }
    }

    /// Creates a new `Value` with a `Geometry` value.
    pub fn geometry(value: Geometry) -> Self {
        Self {
            value: Some(ValueEnum::Geometry(value)),
        }
    }

    /// Creates a new `Value` with a `Table` value.
    pub fn table(value: String) -> Self {
        Self {
            value: Some(ValueEnum::Table(value)),
        }
    }

    /// Creates a new `Value` with a `RecordId` value.
    pub fn record_id(value: RecordId) -> Self {
        Self {
            value: Some(ValueEnum::RecordId(value)),
        }
    }

    /// Creates a new `Value` with a `File` value.
    pub fn file(value: File) -> Self {
        Self {
            value: Some(ValueEnum::File(value)),
        }
    }

    /// Creates a new `Value` with a `Set` value.
    pub fn set(value: Set) -> Self {
        Self {
            value: Some(ValueEnum::Set(value)),
        }
    }

    /// Returns `true` if the `Value` is SurrealDB's `NONE`.
    ///
    /// An unset variant is not `NONE` — see [`Value::is_unset`].
    pub fn is_none(&self) -> bool {
        matches!(self.value, Some(ValueEnum::None(_)))
    }

    /// Returns `true` if the `Value` is `Null`.
    pub fn is_null(&self) -> bool {
        matches!(self.value, Some(ValueEnum::Null(_)))
    }

    /// Returns `true` if no variant is set.
    ///
    /// This means the peer sent a variant this build does not know about, or
    /// the message is malformed. Callers MUST NOT treat it as `NONE`.
    pub fn is_unset(&self) -> bool {
        self.value.is_none()
    }

    /// Gets a value from the `Value` by key.
    pub fn get(&self, key: &str) -> Option<&Value> {
        match self.value {
            Some(ValueEnum::Object(ref obj)) => obj.get(key),
            _ => None,
        }
    }

    /// Removes a value from the `Value` by key.
    pub fn remove(&mut self, key: &str) -> Option<Value> {
        match self.value {
            Some(ValueEnum::Object(ref mut obj)) => obj.remove(key),
            _ => None,
        }
    }
}

impl Decimal {
    /// Creates a new `Decimal` with a `value` value.
    pub fn new(value: String) -> Self {
        Self { value }
    }

    /// Converts the `Decimal` to an `i64` if possible.
    pub fn to_i64(&self) -> Option<i64> {
        self.value.parse::<i64>().ok()
    }

    /// Converts the `Decimal` to an `f64` if possible.
    pub fn to_f64(&self) -> Option<f64> {
        self.value.parse::<f64>().ok()
    }
}

impl Uuid {
    /// Creates a new `Uuid` from its 16 raw bytes.
    pub fn new(bytes: [u8; 16]) -> Self {
        Self {
            bytes: Bytes::copy_from_slice(&bytes),
        }
    }

    /// Creates a new `Uuid` from a [`uuid::Uuid`].
    pub fn from_uuid(value: uuid::Uuid) -> Self {
        Self::new(*value.as_bytes())
    }

    /// Converts to a [`uuid::Uuid`], rejecting anything that is not exactly 16
    /// bytes.
    pub fn to_uuid(&self) -> anyhow::Result<uuid::Uuid> {
        let bytes: [u8; 16] = self.bytes.as_ref().try_into().map_err(|_| {
            anyhow::anyhow!("Invalid UUID: expected 16 bytes, got {}", self.bytes.len())
        })?;
        Ok(uuid::Uuid::from_bytes(bytes))
    }
}

impl Display for Uuid {
    /// Formats as the hyphenated form, or as `invalid-uuid:<hex>` when the
    /// payload is not 16 bytes — `Display` cannot fail, and silently rendering
    /// a malformed id as a plausible UUID would be worse.
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self.to_uuid() {
            Ok(uuid) => write!(f, "{uuid}"),
            Err(_) => {
                write!(f, "invalid-uuid:")?;
                for byte in self.bytes.iter() {
                    write!(f, "{byte:02x}")?;
                }
                Ok(())
            }
        }
    }
}

impl Duration {
    /// Creates a new `Duration`.
    pub fn new(seconds: u64, nanos: u32) -> Self {
        Self { seconds, nanos }
    }
}

impl From<std::time::Duration> for Duration {
    fn from(value: std::time::Duration) -> Self {
        Self::new(value.as_secs(), value.subsec_nanos())
    }
}

impl TryFrom<Duration> for std::time::Duration {
    type Error = anyhow::Error;

    /// Fallible because the wire type is wider than what it is allowed to
    /// carry: `nanos` is a `uint32`, so a peer can send a value that both
    /// violates the documented `[0, 999999999]` bound and, once carried into
    /// `seconds`, overflows `u64`. `std::time::Duration::new` panics on that,
    /// and `timeout` rides on every request -- so an infallible conversion
    /// here is a remotely triggerable abort.
    fn try_from(value: Duration) -> Result<Self, Self::Error> {
        if value.nanos > 999_999_999 {
            return Err(anyhow::anyhow!(
                "invalid Duration: nanos must be in [0, 999999999], got {}",
                value.nanos
            ));
        }
        Ok(std::time::Duration::new(value.seconds, value.nanos))
    }
}

impl Datetime {
    /// Creates a new `Datetime` from seconds since the Unix epoch and a
    /// sub-second remainder that is always added, never subtracted.
    pub fn new(seconds: i64, nanos: u32) -> Self {
        Self { seconds, nanos }
    }

    /// Converts to a [`chrono::DateTime<Utc>`].
    ///
    /// Returns `None` when the instant falls outside chrono's representable
    /// range. The wire format is deliberately wider than the well-known types
    /// it replaced, so this conversion is fallible where those were not.
    pub fn to_chrono(&self) -> Option<chrono::DateTime<chrono::Utc>> {
        chrono::DateTime::from_timestamp(self.seconds, self.nanos)
    }

    /// Creates a `Datetime` from a [`chrono::DateTime<Utc>`].
    pub fn from_chrono(value: chrono::DateTime<chrono::Utc>) -> Self {
        Self::new(value.timestamp(), value.timestamp_subsec_nanos())
    }
}

impl Display for Datetime {
    /// Formats as RFC 3339, or as `seconds.nanos` when the instant is outside
    /// chrono's range — `Display` cannot fail, and this format stays
    /// unambiguous.
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self.to_chrono() {
            Some(datetime) => write!(f, "{}", datetime.to_rfc3339()),
            None => write!(f, "{}.{:09}", self.seconds, self.nanos),
        }
    }
}

impl Array {
    /// Creates a new `Array` with a `values` value.
    pub fn new(values: Vec<Value>) -> Self {
        Self { values }
    }

    /// Returns an iterator over the `Array` values.
    pub fn iter(&self) -> impl Iterator<Item = &Value> {
        self.values.iter()
    }
}

impl IntoIterator for Array {
    type Item = Value;
    type IntoIter = std::vec::IntoIter<Self::Item>;
    fn into_iter(self) -> Self::IntoIter {
        self.values.into_iter()
    }
}

impl KeyValue {
    /// Creates a new key/value entry.
    pub fn new(key: impl Into<String>, value: Value) -> Self {
        Self {
            key: key.into(),
            value: Some(value),
        }
    }
}

impl Object {
    /// Creates a new `Object`.
    ///
    /// Takes a `BTreeMap` so entries land in the ascending key order the wire
    /// format requires and duplicate keys cannot be constructed.
    pub fn new(items: BTreeMap<String, Value>) -> Self {
        Self::from(items)
    }

    /// Gets a value from the `Object` by key.
    pub fn get(&self, key: &str) -> Option<&Value> {
        self.items
            .iter()
            .find(|entry| entry.key == key)
            .and_then(|entry| entry.value.as_ref())
    }

    /// Removes a value from the `Object` by key, returning it if present.
    pub fn remove(&mut self, key: &str) -> Option<Value> {
        let index = self.items.iter().position(|entry| entry.key == key)?;
        self.items.remove(index).value
    }

    /// Returns an iterator over the object's entries, in wire order.
    pub fn iter(&self) -> impl Iterator<Item = &KeyValue> {
        self.items.iter()
    }
}

impl Geometry {
    /// Creates a new `Geometry` with a `values` value.
    pub fn new(geometry: GeometryEnum) -> Self {
        Self {
            geometry: Some(geometry),
        }
    }

    /// Creates a new `Geometry` with a `Point` value.
    pub fn point(value: Point) -> Self {
        Self {
            geometry: Some(GeometryEnum::Point(value)),
        }
    }

    /// Creates a new `Geometry` with a `Line` value.
    pub fn line(value: Line) -> Self {
        Self {
            geometry: Some(GeometryEnum::Line(value)),
        }
    }

    /// Creates a new `Geometry` with a `Polygon` value.
    pub fn polygon(value: Polygon) -> Self {
        Self {
            geometry: Some(GeometryEnum::Polygon(value)),
        }
    }

    /// Creates a new `Geometry` with a `MultiPoint` value.
    pub fn multi_point(value: MultiPoint) -> Self {
        Self {
            geometry: Some(GeometryEnum::MultiPoint(value)),
        }
    }

    /// Creates a new `Geometry` with a `MultiLine` value.
    pub fn multi_line(value: MultiLine) -> Self {
        Self {
            geometry: Some(GeometryEnum::MultiLine(value)),
        }
    }

    /// Creates a new `Geometry` with a `MultiPolygon` value.
    pub fn multi_polygon(value: MultiPolygon) -> Self {
        Self {
            geometry: Some(GeometryEnum::MultiPolygon(value)),
        }
    }

    /// Creates a new `Geometry` with a `GeometryCollection` value.
    pub fn collection(value: GeometryCollection) -> Self {
        Self {
            geometry: Some(GeometryEnum::Collection(value)),
        }
    }
}

impl Point {
    /// Creates a new `Point` with a `x` and `y` value.
    pub fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }
}

impl MultiPoint {
    /// Creates a new `MultiPoint` with a `points` value.
    pub fn new(points: Vec<Point>) -> Self {
        Self { points }
    }
}

impl Line {
    /// Creates a new `Line` with a `points` value.
    pub fn new(points: Vec<Point>) -> Self {
        Self { points }
    }
}

impl MultiLine {
    /// Creates a new `MultiLine` with a `lines` value.
    pub fn new(lines: Vec<Line>) -> Self {
        Self { lines }
    }
}

impl Polygon {
    /// Creates a new `Polygon` with a `points` value.
    pub fn new(exterior: Line, interiors: Vec<Line>) -> Self {
        Self {
            exterior: Some(exterior),
            interiors,
        }
    }
}

impl MultiPolygon {
    /// Creates a new `MultiPolygon` with a `polygons` value.
    pub fn new(polygons: Vec<Polygon>) -> Self {
        Self { polygons }
    }
}

impl RecordId {
    /// Creates a new `RecordId` with a `table` and `id` value.
    pub fn new(table: String, id: Option<RecordIdKey>) -> Self {
        Self { table, id }
    }
}

impl File {
    /// Creates a new `File` with a `bucket` and `key` value.
    pub fn new(bucket: String, key: String) -> Self {
        Self { bucket, key }
    }
}
