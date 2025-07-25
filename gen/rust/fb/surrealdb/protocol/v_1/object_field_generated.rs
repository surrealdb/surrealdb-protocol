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
pub enum ObjectFieldOffset {}
#[derive(Copy, Clone, PartialEq)]

pub struct ObjectField<'a> {
  pub _tab: flatbuffers::Table<'a>,
}

impl<'a> flatbuffers::Follow<'a> for ObjectField<'a> {
  type Inner = ObjectField<'a>;
  #[inline]
  unsafe fn follow(buf: &'a [u8], loc: usize) -> Self::Inner {
    Self { _tab: flatbuffers::Table::new(buf, loc) }
  }
}

impl<'a> ObjectField<'a> {
  pub const VT_KEY: flatbuffers::VOffsetT = 4;
  pub const VT_KIND: flatbuffers::VOffsetT = 6;

  #[inline]
  pub unsafe fn init_from_table(table: flatbuffers::Table<'a>) -> Self {
    ObjectField { _tab: table }
  }
  #[allow(unused_mut)]
  pub fn create<'bldr: 'args, 'args: 'mut_bldr, 'mut_bldr, A: flatbuffers::Allocator + 'bldr>(
    _fbb: &'mut_bldr mut flatbuffers::FlatBufferBuilder<'bldr, A>,
    args: &'args ObjectFieldArgs<'args>
  ) -> flatbuffers::WIPOffset<ObjectField<'bldr>> {
    let mut builder = ObjectFieldBuilder::new(_fbb);
    if let Some(x) = args.kind { builder.add_kind(x); }
    if let Some(x) = args.key { builder.add_key(x); }
    builder.finish()
  }


  #[inline]
  pub fn key(&self) -> Option<&'a str> {
    // Safety:
    // Created from valid Table for this object
    // which contains a valid value in this slot
    unsafe { self._tab.get::<flatbuffers::ForwardsUOffset<&str>>(ObjectField::VT_KEY, None)}
  }
  #[inline]
  pub fn kind(&self) -> Option<Kind<'a>> {
    // Safety:
    // Created from valid Table for this object
    // which contains a valid value in this slot
    unsafe { self._tab.get::<flatbuffers::ForwardsUOffset<Kind>>(ObjectField::VT_KIND, None)}
  }
}

impl flatbuffers::Verifiable for ObjectField<'_> {
  #[inline]
  fn run_verifier(
    v: &mut flatbuffers::Verifier, pos: usize
  ) -> Result<(), flatbuffers::InvalidFlatbuffer> {
    use self::flatbuffers::Verifiable;
    v.visit_table(pos)?
     .visit_field::<flatbuffers::ForwardsUOffset<&str>>("key", Self::VT_KEY, false)?
     .visit_field::<flatbuffers::ForwardsUOffset<Kind>>("kind", Self::VT_KIND, false)?
     .finish();
    Ok(())
  }
}
pub struct ObjectFieldArgs<'a> {
    pub key: Option<flatbuffers::WIPOffset<&'a str>>,
    pub kind: Option<flatbuffers::WIPOffset<Kind<'a>>>,
}
impl<'a> Default for ObjectFieldArgs<'a> {
  #[inline]
  fn default() -> Self {
    ObjectFieldArgs {
      key: None,
      kind: None,
    }
  }
}

pub struct ObjectFieldBuilder<'a: 'b, 'b, A: flatbuffers::Allocator + 'a> {
  fbb_: &'b mut flatbuffers::FlatBufferBuilder<'a, A>,
  start_: flatbuffers::WIPOffset<flatbuffers::TableUnfinishedWIPOffset>,
}
impl<'a: 'b, 'b, A: flatbuffers::Allocator + 'a> ObjectFieldBuilder<'a, 'b, A> {
  #[inline]
  pub fn add_key(&mut self, key: flatbuffers::WIPOffset<&'b  str>) {
    self.fbb_.push_slot_always::<flatbuffers::WIPOffset<_>>(ObjectField::VT_KEY, key);
  }
  #[inline]
  pub fn add_kind(&mut self, kind: flatbuffers::WIPOffset<Kind<'b >>) {
    self.fbb_.push_slot_always::<flatbuffers::WIPOffset<Kind>>(ObjectField::VT_KIND, kind);
  }
  #[inline]
  pub fn new(_fbb: &'b mut flatbuffers::FlatBufferBuilder<'a, A>) -> ObjectFieldBuilder<'a, 'b, A> {
    let start = _fbb.start_table();
    ObjectFieldBuilder {
      fbb_: _fbb,
      start_: start,
    }
  }
  #[inline]
  pub fn finish(self) -> flatbuffers::WIPOffset<ObjectField<'a>> {
    let o = self.fbb_.end_table(self.start_);
    flatbuffers::WIPOffset::new(o.value())
  }
}

impl core::fmt::Debug for ObjectField<'_> {
  fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
    let mut ds = f.debug_struct("ObjectField");
      ds.field("key", &self.key());
      ds.field("kind", &self.kind());
      ds.finish()
  }
}
