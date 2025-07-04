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
pub enum PartOffset {}
#[derive(Copy, Clone, PartialEq)]

pub struct Part<'a> {
  pub _tab: flatbuffers::Table<'a>,
}

impl<'a> flatbuffers::Follow<'a> for Part<'a> {
  type Inner = Part<'a>;
  #[inline]
  unsafe fn follow(buf: &'a [u8], loc: usize) -> Self::Inner {
    Self { _tab: flatbuffers::Table::new(buf, loc) }
  }
}

impl<'a> Part<'a> {
  pub const VT_PART_TYPE: flatbuffers::VOffsetT = 4;
  pub const VT_PART: flatbuffers::VOffsetT = 6;

  #[inline]
  pub unsafe fn init_from_table(table: flatbuffers::Table<'a>) -> Self {
    Part { _tab: table }
  }
  #[allow(unused_mut)]
  pub fn create<'bldr: 'args, 'args: 'mut_bldr, 'mut_bldr, A: flatbuffers::Allocator + 'bldr>(
    _fbb: &'mut_bldr mut flatbuffers::FlatBufferBuilder<'bldr, A>,
    args: &'args PartArgs
  ) -> flatbuffers::WIPOffset<Part<'bldr>> {
    let mut builder = PartBuilder::new(_fbb);
    if let Some(x) = args.part { builder.add_part(x); }
    builder.add_part_type(args.part_type);
    builder.finish()
  }


  #[inline]
  pub fn part_type(&self) -> PartType {
    // Safety:
    // Created from valid Table for this object
    // which contains a valid value in this slot
    unsafe { self._tab.get::<PartType>(Part::VT_PART_TYPE, Some(PartType::NONE)).unwrap()}
  }
  #[inline]
  pub fn part(&self) -> Option<flatbuffers::Table<'a>> {
    // Safety:
    // Created from valid Table for this object
    // which contains a valid value in this slot
    unsafe { self._tab.get::<flatbuffers::ForwardsUOffset<flatbuffers::Table<'a>>>(Part::VT_PART, None)}
  }
  #[inline]
  #[allow(non_snake_case)]
  pub fn part_as_all(&self) -> Option<NullValue<'a>> {
    if self.part_type() == PartType::All {
      self.part().map(|t| {
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
  pub fn part_as_flatten(&self) -> Option<NullValue<'a>> {
    if self.part_type() == PartType::Flatten {
      self.part().map(|t| {
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
  pub fn part_as_last(&self) -> Option<NullValue<'a>> {
    if self.part_type() == PartType::Last {
      self.part().map(|t| {
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
  pub fn part_as_first(&self) -> Option<NullValue<'a>> {
    if self.part_type() == PartType::First {
      self.part().map(|t| {
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
  pub fn part_as_start(&self) -> Option<Value<'a>> {
    if self.part_type() == PartType::Start {
      self.part().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { Value::init_from_table(t) }
     })
    } else {
      None
    }
  }

  #[inline]
  #[allow(non_snake_case)]
  pub fn part_as_field(&self) -> Option<StringValue<'a>> {
    if self.part_type() == PartType::Field {
      self.part().map(|t| {
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
  pub fn part_as_index(&self) -> Option<Int64Value<'a>> {
    if self.part_type() == PartType::Index {
      self.part().map(|t| {
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
  pub fn part_as_where(&self) -> Option<Value<'a>> {
    if self.part_type() == PartType::Where {
      self.part().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { Value::init_from_table(t) }
     })
    } else {
      None
    }
  }

  #[inline]
  #[allow(non_snake_case)]
  pub fn part_as_graph(&self) -> Option<Graph<'a>> {
    if self.part_type() == PartType::Graph {
      self.part().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { Graph::init_from_table(t) }
     })
    } else {
      None
    }
  }

  #[inline]
  #[allow(non_snake_case)]
  pub fn part_as_value(&self) -> Option<Value<'a>> {
    if self.part_type() == PartType::Value {
      self.part().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { Value::init_from_table(t) }
     })
    } else {
      None
    }
  }

  #[inline]
  #[allow(non_snake_case)]
  pub fn part_as_method(&self) -> Option<MethodPart<'a>> {
    if self.part_type() == PartType::Method {
      self.part().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { MethodPart::init_from_table(t) }
     })
    } else {
      None
    }
  }

  #[inline]
  #[allow(non_snake_case)]
  pub fn part_as_destructure(&self) -> Option<DestructureParts<'a>> {
    if self.part_type() == PartType::Destructure {
      self.part().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { DestructureParts::init_from_table(t) }
     })
    } else {
      None
    }
  }

  #[inline]
  #[allow(non_snake_case)]
  pub fn part_as_optional(&self) -> Option<NullValue<'a>> {
    if self.part_type() == PartType::Optional {
      self.part().map(|t| {
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
  pub fn part_as_recurse(&self) -> Option<RecursePart<'a>> {
    if self.part_type() == PartType::Recurse {
      self.part().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { RecursePart::init_from_table(t) }
     })
    } else {
      None
    }
  }

  #[inline]
  #[allow(non_snake_case)]
  pub fn part_as_doc(&self) -> Option<NullValue<'a>> {
    if self.part_type() == PartType::Doc {
      self.part().map(|t| {
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
  pub fn part_as_repeat_recurse(&self) -> Option<NullValue<'a>> {
    if self.part_type() == PartType::RepeatRecurse {
      self.part().map(|t| {
       // Safety:
       // Created from a valid Table for this object
       // Which contains a valid union in this slot
       unsafe { NullValue::init_from_table(t) }
     })
    } else {
      None
    }
  }

}

impl flatbuffers::Verifiable for Part<'_> {
  #[inline]
  fn run_verifier(
    v: &mut flatbuffers::Verifier, pos: usize
  ) -> Result<(), flatbuffers::InvalidFlatbuffer> {
    use self::flatbuffers::Verifiable;
    v.visit_table(pos)?
     .visit_union::<PartType, _>("part_type", Self::VT_PART_TYPE, "part", Self::VT_PART, false, |key, v, pos| {
        match key {
          PartType::All => v.verify_union_variant::<flatbuffers::ForwardsUOffset<NullValue>>("PartType::All", pos),
          PartType::Flatten => v.verify_union_variant::<flatbuffers::ForwardsUOffset<NullValue>>("PartType::Flatten", pos),
          PartType::Last => v.verify_union_variant::<flatbuffers::ForwardsUOffset<NullValue>>("PartType::Last", pos),
          PartType::First => v.verify_union_variant::<flatbuffers::ForwardsUOffset<NullValue>>("PartType::First", pos),
          PartType::Start => v.verify_union_variant::<flatbuffers::ForwardsUOffset<Value>>("PartType::Start", pos),
          PartType::Field => v.verify_union_variant::<flatbuffers::ForwardsUOffset<StringValue>>("PartType::Field", pos),
          PartType::Index => v.verify_union_variant::<flatbuffers::ForwardsUOffset<Int64Value>>("PartType::Index", pos),
          PartType::Where => v.verify_union_variant::<flatbuffers::ForwardsUOffset<Value>>("PartType::Where", pos),
          PartType::Graph => v.verify_union_variant::<flatbuffers::ForwardsUOffset<Graph>>("PartType::Graph", pos),
          PartType::Value => v.verify_union_variant::<flatbuffers::ForwardsUOffset<Value>>("PartType::Value", pos),
          PartType::Method => v.verify_union_variant::<flatbuffers::ForwardsUOffset<MethodPart>>("PartType::Method", pos),
          PartType::Destructure => v.verify_union_variant::<flatbuffers::ForwardsUOffset<DestructureParts>>("PartType::Destructure", pos),
          PartType::Optional => v.verify_union_variant::<flatbuffers::ForwardsUOffset<NullValue>>("PartType::Optional", pos),
          PartType::Recurse => v.verify_union_variant::<flatbuffers::ForwardsUOffset<RecursePart>>("PartType::Recurse", pos),
          PartType::Doc => v.verify_union_variant::<flatbuffers::ForwardsUOffset<NullValue>>("PartType::Doc", pos),
          PartType::RepeatRecurse => v.verify_union_variant::<flatbuffers::ForwardsUOffset<NullValue>>("PartType::RepeatRecurse", pos),
          _ => Ok(()),
        }
     })?
     .finish();
    Ok(())
  }
}
pub struct PartArgs {
    pub part_type: PartType,
    pub part: Option<flatbuffers::WIPOffset<flatbuffers::UnionWIPOffset>>,
}
impl<'a> Default for PartArgs {
  #[inline]
  fn default() -> Self {
    PartArgs {
      part_type: PartType::NONE,
      part: None,
    }
  }
}

pub struct PartBuilder<'a: 'b, 'b, A: flatbuffers::Allocator + 'a> {
  fbb_: &'b mut flatbuffers::FlatBufferBuilder<'a, A>,
  start_: flatbuffers::WIPOffset<flatbuffers::TableUnfinishedWIPOffset>,
}
impl<'a: 'b, 'b, A: flatbuffers::Allocator + 'a> PartBuilder<'a, 'b, A> {
  #[inline]
  pub fn add_part_type(&mut self, part_type: PartType) {
    self.fbb_.push_slot::<PartType>(Part::VT_PART_TYPE, part_type, PartType::NONE);
  }
  #[inline]
  pub fn add_part(&mut self, part: flatbuffers::WIPOffset<flatbuffers::UnionWIPOffset>) {
    self.fbb_.push_slot_always::<flatbuffers::WIPOffset<_>>(Part::VT_PART, part);
  }
  #[inline]
  pub fn new(_fbb: &'b mut flatbuffers::FlatBufferBuilder<'a, A>) -> PartBuilder<'a, 'b, A> {
    let start = _fbb.start_table();
    PartBuilder {
      fbb_: _fbb,
      start_: start,
    }
  }
  #[inline]
  pub fn finish(self) -> flatbuffers::WIPOffset<Part<'a>> {
    let o = self.fbb_.end_table(self.start_);
    flatbuffers::WIPOffset::new(o.value())
  }
}

impl core::fmt::Debug for Part<'_> {
  fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
    let mut ds = f.debug_struct("Part");
      ds.field("part_type", &self.part_type());
      match self.part_type() {
        PartType::All => {
          if let Some(x) = self.part_as_all() {
            ds.field("part", &x)
          } else {
            ds.field("part", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        PartType::Flatten => {
          if let Some(x) = self.part_as_flatten() {
            ds.field("part", &x)
          } else {
            ds.field("part", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        PartType::Last => {
          if let Some(x) = self.part_as_last() {
            ds.field("part", &x)
          } else {
            ds.field("part", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        PartType::First => {
          if let Some(x) = self.part_as_first() {
            ds.field("part", &x)
          } else {
            ds.field("part", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        PartType::Start => {
          if let Some(x) = self.part_as_start() {
            ds.field("part", &x)
          } else {
            ds.field("part", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        PartType::Field => {
          if let Some(x) = self.part_as_field() {
            ds.field("part", &x)
          } else {
            ds.field("part", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        PartType::Index => {
          if let Some(x) = self.part_as_index() {
            ds.field("part", &x)
          } else {
            ds.field("part", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        PartType::Where => {
          if let Some(x) = self.part_as_where() {
            ds.field("part", &x)
          } else {
            ds.field("part", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        PartType::Graph => {
          if let Some(x) = self.part_as_graph() {
            ds.field("part", &x)
          } else {
            ds.field("part", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        PartType::Value => {
          if let Some(x) = self.part_as_value() {
            ds.field("part", &x)
          } else {
            ds.field("part", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        PartType::Method => {
          if let Some(x) = self.part_as_method() {
            ds.field("part", &x)
          } else {
            ds.field("part", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        PartType::Destructure => {
          if let Some(x) = self.part_as_destructure() {
            ds.field("part", &x)
          } else {
            ds.field("part", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        PartType::Optional => {
          if let Some(x) = self.part_as_optional() {
            ds.field("part", &x)
          } else {
            ds.field("part", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        PartType::Recurse => {
          if let Some(x) = self.part_as_recurse() {
            ds.field("part", &x)
          } else {
            ds.field("part", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        PartType::Doc => {
          if let Some(x) = self.part_as_doc() {
            ds.field("part", &x)
          } else {
            ds.field("part", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        PartType::RepeatRecurse => {
          if let Some(x) = self.part_as_repeat_recurse() {
            ds.field("part", &x)
          } else {
            ds.field("part", &"InvalidFlatbuffer: Union discriminant does not match value.")
          }
        },
        _ => {
          let x: Option<()> = None;
          ds.field("part", &x)
        },
      };
      ds.finish()
  }
}
