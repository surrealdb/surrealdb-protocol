use crate::proto::v1::geometry::Geometry as GeometryEnum;
use crate::proto::v1::{
    Array, Decimal, File, Geometry, GeometryCollection, Id, NullValue, Object, RecordId, Uuid,
    Value,
};
use crate::proto::v1::{Line, MultiLine, MultiPoint, MultiPolygon, Point, Polygon};

use crate::proto::v1::value::Value as ValueEnum;
use bytes::Bytes;
use prost_types::{Duration, Timestamp};
use std::collections::BTreeMap;
use std::fmt::Display;

impl Value {
    /// Creates a new `Value` with a `None` value.
    pub fn none() -> Self {
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

    /// Creates a new `Value` with a `Uint64` value.
    pub fn uint64(value: u64) -> Self {
        Self {
            value: Some(ValueEnum::Uint64(value)),
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
    pub fn datetime(value: Timestamp) -> Self {
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

    /// Creates a new `Value` with a `Geometry` value.
    pub fn geometry(value: Geometry) -> Self {
        Self {
            value: Some(ValueEnum::Geometry(value)),
        }
    }

    /// Creates a new `Value` with a `RecordId` value.
    pub fn record_id(value: RecordId) -> Self {
        Self {
            value: Some(ValueEnum::RecordId(Box::new(value))),
        }
    }

    /// Creates a new `Value` with a `File` value.
    pub fn file(value: File) -> Self {
        Self {
            value: Some(ValueEnum::File(value)),
        }
    }

    /// Returns `true` if the `Value` is `None`.
    pub fn is_none(&self) -> bool {
        self.value.is_none()
    }

    /// Returns `true` if the `Value` is `Null`.
    pub fn is_null(&self) -> bool {
        self.value.is_some() && matches!(self.value, Some(ValueEnum::Null(_)))
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
            Some(ValueEnum::Object(ref mut obj)) => obj.items.remove(key),
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
    /// Creates a new `Uuid` with a `value` value.
    pub fn new(value: String) -> Self {
        Self { value }
    }
}

impl Display for Uuid {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.value)
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

impl Object {
    /// Creates a new `Object` with a `values` value.
    pub fn new(items: BTreeMap<String, Value>) -> Self {
        Self { items }
    }

    /// Gets a value from the `Object` by key.
    pub fn get(&self, key: &str) -> Option<&Value> {
        self.items.get(key)
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
    pub fn new(table: String, id: Option<Id>) -> Self {
        Self {
            table,
            id: id.map(Box::new),
        }
    }
}

impl File {
    /// Creates a new `File` with a `bucket` and `key` value.
    pub fn new(bucket: String, key: String) -> Self {
        Self { bucket, key }
    }
}
