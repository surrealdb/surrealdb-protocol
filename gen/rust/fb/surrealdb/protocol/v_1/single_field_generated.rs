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
pub enum SingleFieldOffset {}
#[derive(Copy, Clone, PartialEq)]

pub struct SingleField<'a> {
  pub _tab: flatbuffers::Table<'a>,
}

impl<'a> flatbuffers::Follow<'a> for SingleField<'a> {
  type Inner = SingleField<'a>;
  #[inline]
  unsafe fn follow(buf: &'a [u8], loc: usize) -> Self::Inner {
    Self { _tab: flatbuffers::Table::new(buf, loc) }
  }
}

impl<'a> SingleField<'a> {
  pub const VT_EXPR: flatbuffers::VOffsetT = 4;
  pub const VT_ALIAS: flatbuffers::VOffsetT = 6;

  #[inline]
  pub unsafe fn init_from_table(table: flatbuffers::Table<'a>) -> Self {
    SingleField { _tab: table }
  }
  #[allow(unused_mut)]
  pub fn create<'bldr: 'args, 'args: 'mut_bldr, 'mut_bldr, A: flatbuffers::Allocator + 'bldr>(
    _fbb: &'mut_bldr mut flatbuffers::FlatBufferBuilder<'bldr, A>,
    args: &'args SingleFieldArgs<'args>
  ) -> flatbuffers::WIPOffset<SingleField<'bldr>> {
    let mut builder = SingleFieldBuilder::new(_fbb);
    if let Some(x) = args.alias { builder.add_alias(x); }
    if let Some(x) = args.expr { builder.add_expr(x); }
    builder.finish()
  }


  #[inline]
  pub fn expr(&self) -> Option<Value<'a>> {
    // Safety:
    // Created from valid Table for this object
    // which contains a valid value in this slot
    unsafe { self._tab.get::<flatbuffers::ForwardsUOffset<Value>>(SingleField::VT_EXPR, None)}
  }
  #[inline]
  pub fn alias(&self) -> Option<Idiom<'a>> {
    // Safety:
    // Created from valid Table for this object
    // which contains a valid value in this slot
    unsafe { self._tab.get::<flatbuffers::ForwardsUOffset<Idiom>>(SingleField::VT_ALIAS, None)}
  }
}

impl flatbuffers::Verifiable for SingleField<'_> {
  #[inline]
  fn run_verifier(
    v: &mut flatbuffers::Verifier, pos: usize
  ) -> Result<(), flatbuffers::InvalidFlatbuffer> {
    use self::flatbuffers::Verifiable;
    v.visit_table(pos)?
     .visit_field::<flatbuffers::ForwardsUOffset<Value>>("expr", Self::VT_EXPR, false)?
     .visit_field::<flatbuffers::ForwardsUOffset<Idiom>>("alias", Self::VT_ALIAS, false)?
     .finish();
    Ok(())
  }
}
pub struct SingleFieldArgs<'a> {
    pub expr: Option<flatbuffers::WIPOffset<Value<'a>>>,
    pub alias: Option<flatbuffers::WIPOffset<Idiom<'a>>>,
}
impl<'a> Default for SingleFieldArgs<'a> {
  #[inline]
  fn default() -> Self {
    SingleFieldArgs {
      expr: None,
      alias: None,
    }
  }
}

pub struct SingleFieldBuilder<'a: 'b, 'b, A: flatbuffers::Allocator + 'a> {
  fbb_: &'b mut flatbuffers::FlatBufferBuilder<'a, A>,
  start_: flatbuffers::WIPOffset<flatbuffers::TableUnfinishedWIPOffset>,
}
impl<'a: 'b, 'b, A: flatbuffers::Allocator + 'a> SingleFieldBuilder<'a, 'b, A> {
  #[inline]
  pub fn add_expr(&mut self, expr: flatbuffers::WIPOffset<Value<'b >>) {
    self.fbb_.push_slot_always::<flatbuffers::WIPOffset<Value>>(SingleField::VT_EXPR, expr);
  }
  #[inline]
  pub fn add_alias(&mut self, alias: flatbuffers::WIPOffset<Idiom<'b >>) {
    self.fbb_.push_slot_always::<flatbuffers::WIPOffset<Idiom>>(SingleField::VT_ALIAS, alias);
  }
  #[inline]
  pub fn new(_fbb: &'b mut flatbuffers::FlatBufferBuilder<'a, A>) -> SingleFieldBuilder<'a, 'b, A> {
    let start = _fbb.start_table();
    SingleFieldBuilder {
      fbb_: _fbb,
      start_: start,
    }
  }
  #[inline]
  pub fn finish(self) -> flatbuffers::WIPOffset<SingleField<'a>> {
    let o = self.fbb_.end_table(self.start_);
    flatbuffers::WIPOffset::new(o.value())
  }
}

impl core::fmt::Debug for SingleField<'_> {
  fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
    let mut ds = f.debug_struct("SingleField");
      ds.field("expr", &self.expr());
      ds.field("alias", &self.alias());
      ds.finish()
  }
}
