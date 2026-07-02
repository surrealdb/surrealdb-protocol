//! Ergonomic helpers for the streaming directory-export protocol.
//!
//! The `ExportDirectory` RPC streams a directory-format export
//! (manifest + schema + per-table data files) as a sequence of frames. Each
//! file is sent as a `FileBegin` -> `FileChunk`* -> `FileEnd` run so that
//! neither peer ever buffers a whole file: the file's byte count and SHA-256
//! are carried in the `FileEnd` trailer, computed incrementally as the chunks
//! are produced. The manifest is streamed as the final file (`manifest.json`),
//! so no frame grows with the number of files. The stream is bracketed by a
//! `Begin` frame and terminated by either an `End` frame (success) or an
//! `Error` frame.

use std::fmt::Display;

use bytes::Bytes;

use crate::proto::rpc::v1::{
    ExportDirectoryBegin, ExportDirectoryEnd, ExportDirectoryResponse, ExportError, FileBegin,
    FileChunk, FileEnd, export_config, export_directory_response::Frame,
};

/// The default size, in bytes, of a [`FileChunk`]'s payload (256 KiB).
///
/// Producers should split each file into chunks no larger than this by
/// default; consumers should be able to handle any chunk up to
/// [`MAX_FILE_CHUNK_SIZE`].
pub const DEFAULT_FILE_CHUNK_SIZE: usize = 256 * 1024;

/// The maximum size, in bytes, a [`FileChunk`]'s payload may carry (1 MiB).
///
/// Bounded so a single chunk fits comfortably within every transport binding's
/// message-size limit (gRPC's 4 MiB default, the WebSocket 128 MiB cap) while
/// guaranteeing neither peer has to buffer a whole file.
pub const MAX_FILE_CHUNK_SIZE: usize = 1024 * 1024;

impl From<bool> for export_config::Tables {
    fn from(value: bool) -> Self {
        if value {
            export_config::Tables {
                selection: Some(export_config::tables::Selection::All(Default::default())),
            }
        } else {
            export_config::Tables {
                selection: Some(export_config::tables::Selection::None(Default::default())),
            }
        }
    }
}

impl From<Vec<&str>> for export_config::Tables {
    fn from(values: Vec<&str>) -> Self {
        let mut selected_tables = export_config::SelectedTables::default();
        for v in values {
            selected_tables.tables.push(v.to_string());
        }
        export_config::Tables {
            selection: Some(export_config::tables::Selection::Selected(selected_tables)),
        }
    }
}

impl ExportDirectoryResponse {
    /// Wraps the opening [`ExportDirectoryBegin`] frame of the stream.
    pub fn begin(begin: ExportDirectoryBegin) -> Self {
        Self {
            frame: Some(Frame::Begin(begin)),
        }
    }

    /// Wraps a [`FileBegin`] frame announcing a new file.
    pub fn file_begin(file_begin: FileBegin) -> Self {
        Self {
            frame: Some(Frame::FileBegin(file_begin)),
        }
    }

    /// Builds a [`FileChunk`] frame carrying `data` for the file `file_id`.
    pub fn file_chunk(file_id: u64, data: Bytes) -> Self {
        Self {
            frame: Some(Frame::FileChunk(FileChunk { file_id, data })),
        }
    }

    /// Builds a [`FileEnd`] trailer frame carrying the file's total `bytes` and
    /// `sha256` (lowercase hex).
    pub fn file_end(file_id: u64, bytes: u64, sha256: String) -> Self {
        Self {
            frame: Some(Frame::FileEnd(FileEnd {
                file_id,
                bytes,
                sha256,
            })),
        }
    }

    /// Builds the completion [`ExportDirectoryEnd`] frame carrying the stream
    /// totals.
    pub fn end(file_count: u64, total_bytes: u64) -> Self {
        Self {
            frame: Some(Frame::End(ExportDirectoryEnd {
                file_count,
                total_bytes,
            })),
        }
    }

    /// Builds an [`ExportError`] frame terminating the stream.
    pub fn error(code: i64, message: String) -> Self {
        Self {
            frame: Some(Frame::Error(ExportError { code, message })),
        }
    }
}

impl ExportError {
    /// Creates a new [`ExportError`] with the given code and message.
    pub fn new(code: i64, message: String) -> Self {
        Self { code, message }
    }
}

impl Display for ExportError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "({}): {}", self.code, self.message)
    }
}

impl std::error::Error for ExportError {}

#[cfg(test)]
mod tests {
    use prost::Message;

    use super::*;
    use crate::proto::rpc::v1::{ExportCompression, FileBegin};

    #[test]
    fn tables_from_bool() {
        let all: export_config::Tables = true.into();
        assert!(matches!(
            all.selection,
            Some(export_config::tables::Selection::All(_))
        ));

        let none: export_config::Tables = false.into();
        assert!(matches!(
            none.selection,
            Some(export_config::tables::Selection::None(_))
        ));
    }

    #[test]
    fn tables_from_vec() {
        let tables: export_config::Tables = vec!["users", "posts"].into();
        match tables.selection {
            Some(export_config::tables::Selection::Selected(selected)) => {
                assert_eq!(
                    selected.tables,
                    vec!["users".to_string(), "posts".to_string()]
                );
            }
            other => panic!("expected Selected, got {other:?}"),
        }
    }

    #[test]
    fn frame_constructors() {
        assert!(matches!(
            ExportDirectoryResponse::begin(ExportDirectoryBegin::default()).frame,
            Some(Frame::Begin(_))
        ));
        assert!(matches!(
            ExportDirectoryResponse::file_begin(FileBegin::default()).frame,
            Some(Frame::FileBegin(_))
        ));
        assert!(matches!(
            ExportDirectoryResponse::file_chunk(1, Bytes::from_static(b"x")).frame,
            Some(Frame::FileChunk(_))
        ));
        assert!(matches!(
            ExportDirectoryResponse::file_end(1, 10, "abc".to_string()).frame,
            Some(Frame::FileEnd(_))
        ));
        assert!(matches!(
            ExportDirectoryResponse::end(0, 0).frame,
            Some(Frame::End(_))
        ));
        assert!(matches!(
            ExportDirectoryResponse::error(1, "boom".to_string()).frame,
            Some(Frame::Error(_))
        ));
    }

    #[test]
    fn export_error_display() {
        let err = ExportError::new(7, "nope".to_string());
        assert_eq!(err.to_string(), "(7): nope");
    }

    /// Every frame variant must survive a prost encode/decode round-trip, and
    /// the `FileEnd` trailer must preserve the file's size and hash exactly.
    #[test]
    fn frame_round_trip() {
        let frames = vec![
            ExportDirectoryResponse::begin(ExportDirectoryBegin {
                format_version: "1".to_string(),
                namespace: "ns".to_string(),
                database: "db".to_string(),
                surrealdb_version: "3.0.0".to_string(),
                compression: ExportCompression::Zstd as i32,
            }),
            ExportDirectoryResponse::file_begin(FileBegin {
                file_id: 42,
                relative_path: "data/users/0001.surql.zst".to_string(),
                table: "users".to_string(),
                compression: ExportCompression::Zstd as i32,
            }),
            ExportDirectoryResponse::file_chunk(42, Bytes::from_static(b"chunk-bytes")),
            ExportDirectoryResponse::file_end(42, 4096, "deadbeef".to_string()),
            ExportDirectoryResponse::end(3, 4096),
            ExportDirectoryResponse::error(500, "boom".to_string()),
        ];

        for frame in frames {
            let bytes = frame.encode_to_vec();
            let decoded = ExportDirectoryResponse::decode(bytes.as_slice()).unwrap();
            assert_eq!(frame, decoded);
        }
    }

    #[test]
    fn file_end_trailer_preserves_size_and_hash() {
        let frame = ExportDirectoryResponse::file_end(9, 1_234_567, "abc123".to_string());
        let decoded = ExportDirectoryResponse::decode(frame.encode_to_vec().as_slice()).unwrap();
        match decoded.frame {
            Some(Frame::FileEnd(end)) => {
                assert_eq!(end.file_id, 9);
                assert_eq!(end.bytes, 1_234_567);
                assert_eq!(end.sha256, "abc123");
            }
            other => panic!("expected FileEnd, got {other:?}"),
        }
    }
}
