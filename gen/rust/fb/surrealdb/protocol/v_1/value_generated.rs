// automatically generated by the FlatBuffers compiler, do not modify
// @generated
extern crate alloc;
extern crate flatbuffers;
use alloc::boxed::Box;
use alloc::string::{String, ToString};
use alloc::vec::Vec;
use core::mem;
use core::cmp::Ordering;
use self::flatbuffers::{EndianScalar, Follow};
use super::*;
pub enum ValueOffset {}
#[derive(Copy, Clone, PartialEq)]

pub struct Value<'a> {
  pub _tab: flatbuffers::Table<'a>,
}

impl<'a> flatbuffers::Follow<'a> for Value<'a> {
  type Inner = Value<'a>;
  #[inline]
  unsafe fn follow(buf: &'a [u8], loc: usize) -> Self::Inner {
    Self { _tab: flatbuffers::Table::new(buf, loc) }
  }
}

impl<'a> Value<'a> {
  pub const VT_VALUE_TYPE: flatbuffers::VOffsetT = 4;
  pub const VT_VALUE: flatbuffers::VOffsetT = 6;

  #[inline]
  pub unsafe fn init_from_table(table: flatbuffers::Table<'a>) -> Self {
    Value { _tab: table }
  }
  #[allow(unused_mut)]
  pub fn create<'bldr: 'args, 'args: 'mut_bldr, 'mut_bldr, A: flatbuffers::Allocator + 'bldr>(
    _fbb: &'mut_bldr mut flatbuffers::FlatBufferBuilder<'bldr, A>,
    args: &'args ValueArgs
  ) -> flatbuffers::WIPOffset<Value<'bldr>> {
    let mut builder = ValueBuilder::new(_fbb);
    if let Some(x) = args.value { builder.add_value(x); }
    builder.add_value_type(args.value_type);
    builder.finish()
  }


  #[inline]
  pub fn value_type(&self) -> ValueType {
    // Safety:
    // Created from valid Table for this object
    // which contains a valid value in this slot
    unsafe { self._tab.get::<ValueType>(Value::VT_VALUE_TYPE, Some(ValueType::NONE)).unwrap()}
  }
  #[inline]
  pub fn value(&self) -> Option<flatbuffers::Table<'a>> {
    // Safety:
    // Created from valid Table for this object
    // which contains a valid value in this slot
    unsafe { self._tab.get::<flatbuffers::ForwardsUOffset<flatbuffers::Table<'a>>>(Value::VT_VALUE, None)}
  }
  #[inline]
  #[allow(non_snake_case)]
  pub fn value_as_null(&self) -> Option<NullValue<'a>> {
    if self.value_type() == ValueType::Null {
      self.value().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { NullValue::init_from_table(t) }
     })
    } else {
      None
    }
  }

  #[inline]
  #[allow(non_snake_case)]
  pub fn value_as_bool(&self) -> Option<BoolValue<'a>> {
    if self.value_type() == ValueType::Bool {
      self.value().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { BoolValue::init_from_table(t) }
     })
    } else {
      None
    }
  }

  #[inline]
  #[allow(non_snake_case)]
  pub fn value_as_int_64(&self) -> Option<Int64Value<'a>> {
    if self.value_type() == ValueType::Int64 {
      self.value().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { Int64Value::init_from_table(t) }
     })
    } else {
      None
    }
  }

  #[inline]
  #[allow(non_snake_case)]
  pub fn value_as_uint_64(&self) -> Option<UInt64Value<'a>> {
    if self.value_type() == ValueType::UInt64 {
      self.value().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { UInt64Value::init_from_table(t) }
     })
    } else {
      None
    }
  }

  #[inline]
  #[allow(non_snake_case)]
  pub fn value_as_float_64(&self) -> Option<Float64Value<'a>> {
    if self.value_type() == ValueType::Float64 {
      self.value().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { Float64Value::init_from_table(t) }
     })
    } else {
      None
    }
  }

  #[inline]
  #[allow(non_snake_case)]
  pub fn value_as_string(&self) -> Option<StringValue<'a>> {
    if self.value_type() == ValueType::String {
      self.value().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { StringValue::init_from_table(t) }
     })
    } else {
      None
    }
  }

  #[inline]
  #[allow(non_snake_case)]
  pub fn value_as_bytes(&self) -> Option<Bytes<'a>> {
    if self.value_type() == ValueType::Bytes {
      self.value().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { Bytes::init_from_table(t) }
     })
    } else {
      None
    }
  }

  #[inline]
  #[allow(non_snake_case)]
  pub fn value_as_decimal(&self) -> Option<Decimal<'a>> {
    if self.value_type() == ValueType::Decimal {
      self.value().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { Decimal::init_from_table(t) }
     })
    } else {
      None
    }
  }

  #[inline]
  #[allow(non_snake_case)]
  pub fn value_as_duration(&self) -> Option<Duration<'a>> {
    if self.value_type() == ValueType::Duration {
      self.value().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { Duration::init_from_table(t) }
     })
    } else {
      None
    }
  }

  #[inline]
  #[allow(non_snake_case)]
  pub fn value_as_datetime(&self) -> Option<Timestamp<'a>> {
    if self.value_type() == ValueType::Datetime {
      self.value().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { Timestamp::init_from_table(t) }
     })
    } else {
      None
    }
  }

  #[inline]
  #[allow(non_snake_case)]
  pub fn value_as_uuid(&self) -> Option<Uuid<'a>> {
    if self.value_type() == ValueType::Uuid {
      self.value().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { Uuid::init_from_table(t) }
     })
    } else {
      None
    }
  }

  #[inline]
  #[allow(non_snake_case)]
  pub fn value_as_array(&self) -> Option<Array<'a>> {
    if self.value_type() == ValueType::Array {
      self.value().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { Array::init_from_table(t) }
     })
    } else {
      None
    }
  }

  #[inline]
  #[allow(non_snake_case)]
  pub fn value_as_object(&self) -> Option<Object<'a>> {
    if self.value_type() == ValueType::Object {
      self.value().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { Object::init_from_table(t) }
     })
    } else {
      None
    }
  }

  #[inline]
  #[allow(non_snake_case)]
  pub fn value_as_geometry(&self) -> Option<Geometry<'a>> {
    if self.value_type() == ValueType::Geometry {
      self.value().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { Geometry::init_from_table(t) }
     })
    } else {
      None
    }
  }

  #[inline]
  #[allow(non_snake_case)]
  pub fn value_as_record_id(&self) -> Option<RecordId<'a>> {
    if self.value_type() == ValueType::RecordId {
      self.value().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { RecordId::init_from_table(t) }
     })
    } else {
      None
    }
  }

  #[inline]
  #[allow(non_snake_case)]
  pub fn value_as_file(&self) -> Option<File<'a>> {
    if self.value_type() == ValueType::File {
      self.value().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { File::init_from_table(t) }
     })
    } else {
      None
    }
  }

  #[inline]
  #[allow(non_snake_case)]
  pub fn value_as_range(&self) -> Option<Range<'a>> {
    if self.value_type() == ValueType::Range {
      self.value().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { Range::init_from_table(t) }
     })
    } else {
      None
    }
  }

}

impl flatbuffers::Verifiable for Value<'_> {
  #[inline]
  fn run_verifier(
    v: &mut flatbuffers::Verifier, pos: usize
  ) -> Result<(), flatbuffers::InvalidFlatbuffer> {
    use self::flatbuffers::Verifiable;
    v.visit_table(pos)?
     .visit_union::<ValueType, _>("value_type", Self::VT_VALUE_TYPE, "value", Self::VT_VALUE, false, |key, v, pos| {
        match key {
          ValueType::Null => v.verify_union_variant::<flatbuffers::ForwardsUOffset<NullValue>>("ValueType::Null", pos),
          ValueType::Bool => v.verify_union_variant::<flatbuffers::ForwardsUOffset<BoolValue>>("ValueType::Bool", pos),
          ValueType::Int64 => v.verify_union_variant::<flatbuffers::ForwardsUOffset<Int64Value>>("ValueType::Int64", pos),
          ValueType::UInt64 => v.verify_union_variant::<flatbuffers::ForwardsUOffset<UInt64Value>>("ValueType::UInt64", pos),
          ValueType::Float64 => v.verify_union_variant::<flatbuffers::ForwardsUOffset<Float64Value>>("ValueType::Float64", pos),
          ValueType::String => v.verify_union_variant::<flatbuffers::ForwardsUOffset<StringValue>>("ValueType::String", pos),
          ValueType::Bytes => v.verify_union_variant::<flatbuffers::ForwardsUOffset<Bytes>>("ValueType::Bytes", pos),
          ValueType::Decimal => v.verify_union_variant::<flatbuffers::ForwardsUOffset<Decimal>>("ValueType::Decimal", pos),
          ValueType::Duration => v.verify_union_variant::<flatbuffers::ForwardsUOffset<Duration>>("ValueType::Duration", pos),
          ValueType::Datetime => v.verify_union_variant::<flatbuffers::ForwardsUOffset<Timestamp>>("ValueType::Datetime", pos),
          ValueType::Uuid => v.verify_union_variant::<flatbuffers::ForwardsUOffset<Uuid>>("ValueType::Uuid", pos),
          ValueType::Array => v.verify_union_variant::<flatbuffers::ForwardsUOffset<Array>>("ValueType::Array", pos),
          ValueType::Object => v.verify_union_variant::<flatbuffers::ForwardsUOffset<Object>>("ValueType::Object", pos),
          ValueType::Geometry => v.verify_union_variant::<flatbuffers::ForwardsUOffset<Geometry>>("ValueType::Geometry", pos),
          ValueType::RecordId => v.verify_union_variant::<flatbuffers::ForwardsUOffset<RecordId>>("ValueType::RecordId", pos),
          ValueType::File => v.verify_union_variant::<flatbuffers::ForwardsUOffset<File>>("ValueType::File", pos),
          ValueType::Range => v.verify_union_variant::<flatbuffers::ForwardsUOffset<Range>>("ValueType::Range", pos),
          _ => Ok(()),
        }
     })?
     .finish();
    Ok(())
  }
}
pub struct ValueArgs {
    pub value_type: ValueType,
    pub value: Option<flatbuffers::WIPOffset<flatbuffers::UnionWIPOffset>>,
}
impl<'a> Default for ValueArgs {
  #[inline]
  fn default() -> Self {
    ValueArgs {
      value_type: ValueType::NONE,
      value: None,
    }
  }
}

pub struct ValueBuilder<'a: 'b, 'b, A: flatbuffers::Allocator + 'a> {
  fbb_: &'b mut flatbuffers::FlatBufferBuilder<'a, A>,
  start_: flatbuffers::WIPOffset<flatbuffers::TableUnfinishedWIPOffset>,
}
impl<'a: 'b, 'b, A: flatbuffers::Allocator + 'a> ValueBuilder<'a, 'b, A> {
  #[inline]
  pub fn add_value_type(&mut self, value_type: ValueType) {
    self.fbb_.push_slot::<ValueType>(Value::VT_VALUE_TYPE, value_type, ValueType::NONE);
  }
  #[inline]
  pub fn add_value(&mut self, value: flatbuffers::WIPOffset<flatbuffers::UnionWIPOffset>) {
    self.fbb_.push_slot_always::<flatbuffers::WIPOffset<_>>(Value::VT_VALUE, value);
  }
  #[inline]
  pub fn new(_fbb: &'b mut flatbuffers::FlatBufferBuilder<'a, A>) -> ValueBuilder<'a, 'b, A> {
    let start = _fbb.start_table();
    ValueBuilder {
      fbb_: _fbb,
      start_: start,
    }
  }
  #[inline]
  pub fn finish(self) -> flatbuffers::WIPOffset<Value<'a>> {
    let o = self.fbb_.end_table(self.start_);
    flatbuffers::WIPOffset::new(o.value())
  }
}

impl core::fmt::Debug for Value<'_> {
  fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
    let mut ds = f.debug_struct("Value");
      ds.field("value_type", &self.value_type());
      match self.value_type() {
        ValueType::Null => {
          if let Some(x) = self.value_as_null() {
            ds.field("value", &x)
          } else {
            ds.field("value", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        ValueType::Bool => {
          if let Some(x) = self.value_as_bool() {
            ds.field("value", &x)
          } else {
            ds.field("value", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        ValueType::Int64 => {
          if let Some(x) = self.value_as_int_64() {
            ds.field("value", &x)
          } else {
            ds.field("value", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        ValueType::UInt64 => {
          if let Some(x) = self.value_as_uint_64() {
            ds.field("value", &x)
          } else {
            ds.field("value", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        ValueType::Float64 => {
          if let Some(x) = self.value_as_float_64() {
            ds.field("value", &x)
          } else {
            ds.field("value", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        ValueType::String => {
          if let Some(x) = self.value_as_string() {
            ds.field("value", &x)
          } else {
            ds.field("value", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        ValueType::Bytes => {
          if let Some(x) = self.value_as_bytes() {
            ds.field("value", &x)
          } else {
            ds.field("value", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        ValueType::Decimal => {
          if let Some(x) = self.value_as_decimal() {
            ds.field("value", &x)
          } else {
            ds.field("value", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        ValueType::Duration => {
          if let Some(x) = self.value_as_duration() {
            ds.field("value", &x)
          } else {
            ds.field("value", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        ValueType::Datetime => {
          if let Some(x) = self.value_as_datetime() {
            ds.field("value", &x)
          } else {
            ds.field("value", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        ValueType::Uuid => {
          if let Some(x) = self.value_as_uuid() {
            ds.field("value", &x)
          } else {
            ds.field("value", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        ValueType::Array => {
          if let Some(x) = self.value_as_array() {
            ds.field("value", &x)
          } else {
            ds.field("value", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        ValueType::Object => {
          if let Some(x) = self.value_as_object() {
            ds.field("value", &x)
          } else {
            ds.field("value", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        ValueType::Geometry => {
          if let Some(x) = self.value_as_geometry() {
            ds.field("value", &x)
          } else {
            ds.field("value", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        ValueType::RecordId => {
          if let Some(x) = self.value_as_record_id() {
            ds.field("value", &x)
          } else {
            ds.field("value", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        ValueType::File => {
          if let Some(x) = self.value_as_file() {
            ds.field("value", &x)
          } else {
            ds.field("value", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        ValueType::Range => {
          if let Some(x) = self.value_as_range() {
            ds.field("value", &x)
          } else {
            ds.field("value", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        _ => {
          let x: Option<()> = None;
          ds.field("value", &x)
        },
      };
      ds.finish()
  }
}
