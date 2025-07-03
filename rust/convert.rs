use crate::proto::{rpc, v1};
use rust_decimal::Decimal;
use std::{collections::BTreeMap, convert::Infallible};
use uuid::Uuid;

impl TryFrom<v1::Decimal> for Decimal {
    type Error = rust_decimal::Error;

    #[inline]
    fn try_from(proto: v1::Decimal) -> Result<Self, Self::Error> {
        Decimal::from_str_radix(&proto.value, 10)
    }
}

impl TryFrom<Decimal> for v1::Decimal {
    type Error = Infallible;

    #[inline]
    fn try_from(value: Decimal) -> Result<Self, Self::Error> {
        Ok(v1::Decimal {
            value: value.to_string(),
        })
    }
}

impl TryFrom<v1::Uuid> for Uuid {
    type Error = uuid::Error;

    #[inline]
    fn try_from(proto: v1::Uuid) -> Result<Self, Self::Error> {
        Uuid::parse_str(&proto.value)
    }
}

impl TryFrom<Uuid> for v1::Uuid {
    type Error = Infallible;

    #[inline]
    fn try_from(value: Uuid) -> Result<Self, Self::Error> {
        Ok(v1::Uuid {
            value: value.to_string(),
        })
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

impl<T> TryFrom<rpc::v1::Variables> for BTreeMap<String, T>
where
    T: TryFrom<v1::Value>,
{
    type Error = T::Error;

    #[inline]
    fn try_from(value: rpc::v1::Variables) -> Result<Self, Self::Error> {
        let mut map = BTreeMap::new();
        for (key, value) in value.variables {
            map.insert(key, T::try_from(value)?);
        }
        Ok(map)
    }
}

impl<T> TryFrom<BTreeMap<String, T>> for rpc::v1::Variables
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
