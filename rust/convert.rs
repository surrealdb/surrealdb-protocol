use crate::proto::v1::value::Value as ValueInner;
use crate::proto::v1::{self};
use anyhow::Result;
use rust_decimal::Decimal;
use std::collections::BTreeMap;
use std::str::FromStr;
use uuid::Uuid;

/// A trait for converting a type into a `v1::Value` protobuf type.
pub trait TryIntoValue {
    /// Try to convert this type into a `v1::Value` protobuf type.
    fn try_into_value(self) -> Result<v1::Value>;
}

impl TryIntoValue for serde_json::Value {
    fn try_into_value(self) -> Result<v1::Value> {
        use serde_json::Value as JsonValue;
        match self {
            JsonValue::Null => Ok(v1::Value::null()),
            JsonValue::Bool(b) => Ok(v1::Value::bool(b)),
            JsonValue::Number(n) => {
                if n.is_u64() {
                    Ok(v1::Value::uint64(n.as_u64().unwrap()))
                } else if n.is_i64() {
                    Ok(v1::Value::int64(n.as_i64().unwrap()))
                } else {
                    Err(anyhow::anyhow!("Invalid number: {n:?}"))
                }
            }
            JsonValue::String(s) => Ok(v1::Value::string(s)),
            JsonValue::Array(a) => {
                let mut values = Vec::new();
                for value in a {
                    values.push(value.try_into_value()?);
                }
                Ok(v1::Value::array(v1::Array::new(values)))
            }
            JsonValue::Object(o) => {
                let mut values = BTreeMap::new();
                for (k, v) in o {
                    values.insert(k, v.try_into_value()?);
                }
                Ok(v1::Value::object(v1::Object::new(values)))
            }
        }
    }
}

/// A trait for converting a `v1::Value` protobuf type into a type.
pub trait TryFromValue: Sized {
    /// Try to convert a `v1::Value` protobuf type into this type.
    fn try_from_value(value: v1::Value) -> Result<Self>;
}

impl<T> TryFromValue for Option<T>
where
    T: TryFromValue,
{
    #[inline]
    fn try_from_value(value: v1::Value) -> Result<Self> {
        let Some(inner) = value.value else {
            return Ok(None);
        };
        match inner {
            ValueInner::Null(_) => Ok(None),
            v => T::try_from_value(v1::Value { value: Some(v) }).map(Some),
        }
    }
}

impl TryFromValue for v1::Value {
    #[inline]
    fn try_from_value(value: v1::Value) -> Result<Self> {
        Ok(value)
    }
}

impl TryFromValue for semver::Version {
    #[inline]
    fn try_from_value(value: v1::Value) -> Result<Self> {
        let Some(inner) = value.value else {
            return Err(anyhow::anyhow!("Invalid Version: missing value"));
        };
        match inner {
            ValueInner::String(s) => Ok(semver::Version::parse(&s)?),
            _ => Err(anyhow::anyhow!(
                "Invalid Version: expected string, got {:?}",
                inner
            )),
        }
    }
}

impl TryFromValue for String {
    #[inline]
    fn try_from_value(value: v1::Value) -> Result<Self> {
        let Some(inner) = value.value else {
            return Err(anyhow::anyhow!("Invalid String: missing value"));
        };
        match inner {
            ValueInner::String(s) => Ok(s),
            ValueInner::Uuid(u) => Ok(u.to_string()),
            ValueInner::Datetime(d) => Ok(d.to_string()),
            v => Err(anyhow::anyhow!(
                "Invalid String: expected string, got {v:?}"
            )),
        }
    }
}

impl TryFromValue for uuid::Uuid {
    #[inline]
    fn try_from_value(value: v1::Value) -> Result<Self> {
        let Some(inner) = value.value else {
            return Err(anyhow::anyhow!("Invalid UUID: missing value"));
        };
        match inner {
            ValueInner::Uuid(u) => Ok(uuid::Uuid::from_str(&u.value)?),
            unexpected => Err(anyhow::anyhow!(
                "Invalid UUID: expected uuid, got {unexpected:?}"
            )),
        }
    }
}

macro_rules! impl_try_from_value_for_int {
	($t:ty) => {
		impl TryFromValue for $t {
			#[inline]
			fn try_from_value(value: v1::Value) -> Result<Self> {
				let Some(inner) = value.value else {
					return Err(anyhow::anyhow!("Invalid Int: missing value"));
				};
				match inner {
					ValueInner::Int64(v) => Ok(v as Self),
					ValueInner::Uint64(v) => Ok(v as Self),
					ValueInner::Float64(v) => Ok(v as Self),
					ValueInner::Decimal(v) => Ok(v.to_i64().unwrap() as Self),
					v => Err(anyhow::anyhow!("Invalid Int: expected int, got {v:?}")),
				}
			}
		}
	};
	($($t:ty),+ $(,)?) => {
		$(impl_try_from_value_for_int!($t);)+
	};
}

macro_rules! impl_try_from_value_for_float {
	($t:ty) => {
		impl TryFromValue for $t {
			#[inline]
			fn try_from_value(value: v1::Value) -> Result<Self> {
				let Some(inner) = value.value else {
					return Err(anyhow::anyhow!("Invalid Float: missing value"));
				};
				match inner {
					ValueInner::Float64(v) => Ok(v as Self),
					ValueInner::Int64(v) => Ok(v as Self),
					ValueInner::Uint64(v) => Ok(v as Self),
					ValueInner::Decimal(v) => Ok(v.to_f64().unwrap() as Self),
					v => Err(anyhow::anyhow!("Invalid Float: expected float, got {v:?}")),
				}
			}
		}
	};
	($($t:ty),+ $(,)?) => {
		$(impl_try_from_value_for_float!($t);)+
	};
}

impl TryFromValue for bool {
    #[inline]
    fn try_from_value(value: v1::Value) -> Result<Self> {
        let Some(inner) = value.value else {
            return Err(anyhow::anyhow!("Invalid Bool: missing value"));
        };
        match inner {
            ValueInner::Bool(b) => Ok(b),
            v => Err(anyhow::anyhow!("Invalid Bool: expected bool, got {v:?}")),
        }
    }
}

impl_try_from_value_for_int!(i8, i16, i32, i64, isize);
impl_try_from_value_for_int!(u8, u16, u32, u64, usize);
impl_try_from_value_for_float!(f32, f64);

impl TryFromValue for () {
    #[inline]
    fn try_from_value(value: v1::Value) -> Result<Self> {
        let Some(inner) = value.value else {
            return Err(anyhow::anyhow!("Invalid Unit: missing value"));
        };
        match inner {
            ValueInner::Null(_) => Ok(()),
            v => Err(anyhow::anyhow!("Invalid Unit: expected unit, got {v:?}")),
        }
    }
}

impl<T> TryFromValue for Vec<T>
where
    T: TryFromValue,
{
    #[inline]
    fn try_from_value(value: v1::Value) -> Result<Self> {
        let Some(inner) = value.value else {
            return Err(anyhow::anyhow!("Invalid Array: missing value"));
        };
        match inner {
            ValueInner::Array(arr) => arr
                .into_iter()
                .map(T::try_from_value)
                .collect::<Result<Vec<_>>>(),
            ValueInner::Null(_) => Ok(Vec::new()),
            v => Err(anyhow::anyhow!("Invalid Array: expected array, got {v:?}")),
        }
    }
}

impl From<bool> for v1::Value {
    #[inline]
    fn from(value: bool) -> Self {
        Self::bool(value)
    }
}

impl From<i64> for v1::Value {
    #[inline]
    fn from(value: i64) -> Self {
        Self::int64(value)
    }
}

impl From<f64> for v1::Value {
    #[inline]
    fn from(value: f64) -> Self {
        Self::float64(value)
    }
}

impl From<String> for v1::Value {
    #[inline]
    fn from(value: String) -> Self {
        Self::string(value)
    }
}

impl From<&str> for v1::Value {
    #[inline]
    fn from(value: &str) -> Self {
        Self::string(value.to_string())
    }
}

impl From<Vec<bool>> for v1::Value {
    #[inline]
    fn from(value: Vec<bool>) -> Self {
        Self::array(v1::Array::new(value.into_iter().map(Into::into).collect()))
    }
}

impl TryFrom<v1::Decimal> for Decimal {
    type Error = rust_decimal::Error;

    #[inline]
    fn try_from(proto: v1::Decimal) -> Result<Self, Self::Error> {
        Decimal::from_str_radix(&proto.value, 10)
    }
}

impl From<Decimal> for v1::Decimal {
    #[inline]
    fn from(value: Decimal) -> Self {
        v1::Decimal {
            value: value.to_string(),
        }
    }
}

impl TryFrom<v1::Uuid> for Uuid {
    type Error = uuid::Error;

    #[inline]
    fn try_from(proto: v1::Uuid) -> Result<Self, Self::Error> {
        Uuid::parse_str(&proto.value)
    }
}

impl From<Uuid> for v1::Uuid {
    #[inline]
    fn from(value: Uuid) -> Self {
        v1::Uuid {
            value: value.to_string(),
        }
    }
}

impl From<v1::Point> for geo::Coord<f64> {
    #[inline]
    fn from(proto: v1::Point) -> Self {
        Self {
            x: proto.x,
            y: proto.y,
        }
    }
}

impl From<geo::Coord<f64>> for v1::Point {
    #[inline]
    fn from(coord: geo::Coord<f64>) -> Self {
        Self {
            x: coord.x,
            y: coord.y,
        }
    }
}

impl From<v1::Point> for geo::Point<f64> {
    #[inline]
    fn from(proto: v1::Point) -> Self {
        Self::new(proto.x, proto.y)
    }
}

impl From<geo::Point<f64>> for v1::Point {
    #[inline]
    fn from(point: geo::Point<f64>) -> Self {
        Self {
            x: point.x(),
            y: point.y(),
        }
    }
}

impl From<v1::Line> for geo::LineString<f64> {
    #[inline]
    fn from(proto: v1::Line) -> Self {
        Self(proto.points.into_iter().map(Into::into).collect())
    }
}

impl From<geo::LineString<f64>> for v1::Line {
    #[inline]
    fn from(line: geo::LineString<f64>) -> Self {
        Self {
            points: line.0.into_iter().map(Into::into).collect(),
        }
    }
}

impl TryFrom<v1::Polygon> for geo::Polygon<f64> {
    type Error = anyhow::Error;

    #[inline]
    fn try_from(proto: v1::Polygon) -> Result<Self, Self::Error> {
        let Some(exterior) = proto.exterior else {
            return Err(anyhow::anyhow!("Invalid Polygon: missing exterior"));
        };
        let interiors = proto.interiors.into_iter().map(Into::into).collect();
        Ok(Self::new(exterior.into(), interiors))
    }
}

impl From<geo::Polygon<f64>> for v1::Polygon {
    #[inline]
    fn from(polygon: geo::Polygon<f64>) -> Self {
        Self {
            exterior: Some(v1::Line::from(polygon.exterior().clone())),
            interiors: polygon
                .interiors()
                .iter()
                .map(Clone::clone)
                .map(Into::into)
                .collect(),
        }
    }
}

impl From<v1::MultiPoint> for geo::MultiPoint<f64> {
    #[inline]
    fn from(proto: v1::MultiPoint) -> Self {
        Self(proto.points.into_iter().map(Into::into).collect())
    }
}

impl From<geo::MultiPoint<f64>> for v1::MultiPoint {
    #[inline]
    fn from(multi_point: geo::MultiPoint<f64>) -> Self {
        Self {
            points: multi_point.0.into_iter().map(Into::into).collect(),
        }
    }
}

impl From<v1::MultiLine> for geo::MultiLineString<f64> {
    #[inline]
    fn from(proto: v1::MultiLine) -> Self {
        Self(proto.lines.into_iter().map(Into::into).collect())
    }
}

impl From<geo::MultiLineString<f64>> for v1::MultiLine {
    #[inline]
    fn from(multi_line: geo::MultiLineString<f64>) -> Self {
        Self {
            lines: multi_line.0.into_iter().map(Into::into).collect(),
        }
    }
}

impl TryFrom<v1::MultiPolygon> for geo::MultiPolygon<f64> {
    type Error = anyhow::Error;

    #[inline]
    fn try_from(proto: v1::MultiPolygon) -> Result<Self, Self::Error> {
        Ok(Self(
            proto
                .polygons
                .into_iter()
                .map(TryInto::try_into)
                .collect::<Result<Vec<_>, _>>()?,
        ))
    }
}

impl From<geo::MultiPolygon<f64>> for v1::MultiPolygon {
    #[inline]
    fn from(multi_polygon: geo::MultiPolygon<f64>) -> Self {
        Self {
            polygons: multi_polygon.0.into_iter().map(Into::into).collect(),
        }
    }
}

impl<T> TryFrom<v1::GeometryCollection> for Vec<T>
where
    T: TryFrom<v1::Geometry>,
{
    type Error = T::Error;

    #[inline]
    fn try_from(value: v1::GeometryCollection) -> Result<Self, Self::Error> {
        let mut geometries = Vec::with_capacity(value.geometries.len());
        for geometry in value.geometries {
            geometries.push(T::try_from(geometry)?);
        }
        Ok(geometries)
    }
}

impl<T> TryFrom<Vec<T>> for v1::GeometryCollection
where
    T: TryInto<v1::Geometry>,
{
    type Error = T::Error;

    #[inline]
    fn try_from(value: Vec<T>) -> Result<Self, Self::Error> {
        let mut geometries = Vec::with_capacity(value.len());
        for geometry in value {
            geometries.push(geometry.try_into()?);
        }
        Ok(Self { geometries })
    }
}

impl FromIterator<(String, v1::Value)> for v1::Variables {
    fn from_iter<T: IntoIterator<Item = (String, v1::Value)>>(iter: T) -> Self {
        let mut variables = v1::Variables::default();
        for (key, value) in iter {
            variables.variables.insert(key, value);
        }
        variables
    }
}

impl<T> TryFrom<v1::Variables> for BTreeMap<String, T>
where
    T: TryFrom<v1::Value>,
{
    type Error = T::Error;

    #[inline]
    fn try_from(value: v1::Variables) -> Result<Self, Self::Error> {
        let mut map = BTreeMap::new();
        for (key, value) in value.variables {
            map.insert(key, T::try_from(value)?);
        }
        Ok(map)
    }
}

impl<T> TryFrom<BTreeMap<String, T>> for v1::Variables
where
    T: TryInto<v1::Value>,
{
    type Error = T::Error;

    #[inline]
    fn try_from(value: BTreeMap<String, T>) -> Result<Self, Self::Error> {
        let mut map = BTreeMap::new();
        for (key, value) in value {
            map.insert(key, value.try_into()?);
        }

        Ok(Self { variables: map })
    }
}

impl From<BTreeMap<String, v1::Value>> for v1::Object {
    #[inline]
    fn from(value: BTreeMap<String, v1::Value>) -> Self {
        Self { items: value }
    }
}
