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
pub enum TimestampOffset {}
#[derive(Copy, Clone, PartialEq)]

pub struct Timestamp<'a> {
  pub _tab: flatbuffers::Table<'a>,
}

impl<'a> flatbuffers::Follow<'a> for Timestamp<'a> {
  type Inner = Timestamp<'a>;
  #[inline]
  unsafe fn follow(buf: &'a [u8], loc: usize) -> Self::Inner {
    Self { _tab: flatbuffers::Table::new(buf, loc) }
  }
}

impl<'a> Timestamp<'a> {
  pub const VT_SECONDS: flatbuffers::VOffsetT = 4;
  pub const VT_NANOS: flatbuffers::VOffsetT = 6;

  #[inline]
  pub unsafe fn init_from_table(table: flatbuffers::Table<'a>) -> Self {
    Timestamp { _tab: table }
  }
  #[allow(unused_mut)]
  pub fn create<'bldr: 'args, 'args: 'mut_bldr, 'mut_bldr, A: flatbuffers::Allocator + 'bldr>(
    _fbb: &'mut_bldr mut flatbuffers::FlatBufferBuilder<'bldr, A>,
    args: &'args TimestampArgs
  ) -> flatbuffers::WIPOffset<Timestamp<'bldr>> {
    let mut builder = TimestampBuilder::new(_fbb);
    builder.add_seconds(args.seconds);
    builder.add_nanos(args.nanos);
    builder.finish()
  }


  #[inline]
  pub fn seconds(&self) -> i64 {
    // Safety:
    // Created from valid Table for this object
    // which contains a valid value in this slot
    unsafe { self._tab.get::<i64>(Timestamp::VT_SECONDS, Some(0)).unwrap()}
  }
  #[inline]
  pub fn nanos(&self) -> u32 {
    // Safety:
    // Created from valid Table for this object
    // which contains a valid value in this slot
    unsafe { self._tab.get::<u32>(Timestamp::VT_NANOS, Some(0)).unwrap()}
  }
}

impl flatbuffers::Verifiable for Timestamp<'_> {
  #[inline]
  fn run_verifier(
    v: &mut flatbuffers::Verifier, pos: usize
  ) -> Result<(), flatbuffers::InvalidFlatbuffer> {
    use self::flatbuffers::Verifiable;
    v.visit_table(pos)?
     .visit_field::<i64>("seconds", Self::VT_SECONDS, false)?
     .visit_field::<u32>("nanos", Self::VT_NANOS, false)?
     .finish();
    Ok(())
  }
}
pub struct TimestampArgs {
    pub seconds: i64,
    pub nanos: u32,
}
impl<'a> Default for TimestampArgs {
  #[inline]
  fn default() -> Self {
    TimestampArgs {
      seconds: 0,
      nanos: 0,
    }
  }
}

pub struct TimestampBuilder<'a: 'b, 'b, A: flatbuffers::Allocator + 'a> {
  fbb_: &'b mut flatbuffers::FlatBufferBuilder<'a, A>,
  start_: flatbuffers::WIPOffset<flatbuffers::TableUnfinishedWIPOffset>,
}
impl<'a: 'b, 'b, A: flatbuffers::Allocator + 'a> TimestampBuilder<'a, 'b, A> {
  #[inline]
  pub fn add_seconds(&mut self, seconds: i64) {
    self.fbb_.push_slot::<i64>(Timestamp::VT_SECONDS, seconds, 0);
  }
  #[inline]
  pub fn add_nanos(&mut self, nanos: u32) {
    self.fbb_.push_slot::<u32>(Timestamp::VT_NANOS, nanos, 0);
  }
  #[inline]
  pub fn new(_fbb: &'b mut flatbuffers::FlatBufferBuilder<'a, A>) -> TimestampBuilder<'a, 'b, A> {
    let start = _fbb.start_table();
    TimestampBuilder {
      fbb_: _fbb,
      start_: start,
    }
  }
  #[inline]
  pub fn finish(self) -> flatbuffers::WIPOffset<Timestamp<'a>> {
    let o = self.fbb_.end_table(self.start_);
    flatbuffers::WIPOffset::new(o.value())
  }
}

impl core::fmt::Debug for Timestamp<'_> {
  fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
    let mut ds = f.debug_struct("Timestamp");
      ds.field("seconds", &self.seconds());
      ds.field("nanos", &self.nanos());
      ds.finish()
  }
}
