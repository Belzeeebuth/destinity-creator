//! Reader for the engine's shared-memory telemetry block.
//!
//! This is the second, high-rate IPC channel. It exists so 60 Hz meter updates
//! for up to 256 tracks never touch the JSON-RPC socket that transport commands
//! depend on.
//!
//! The layout below mirrors `musio::MeterBlock` in core/include/musio/MeterRing.h.
//! Two safeguards make that duplication safe rather than a latent trap: the magic
//! and version words are checked on every open, and `assert_layout()` pins the
//! sizes this file assumes. If the C++ struct changes without this one following,
//! the version check rejects the block instead of silently misreading it.

use std::fs::File;
use std::path::PathBuf;

use memmap2::Mmap;
use serde::Serialize;

const MAGIC: u32 = 0x4D55_534F; // 'MUSO'
const VERSION: u32 = 1;
const MAX_TRACKS: usize = 256;

/// Mirrors `musio::MeterPayload`. `repr(C)` gives the same field layout and
/// padding rules the C++ compiler used.
#[repr(C)]
#[derive(Clone, Copy)]
struct RawPayload {
    play_head_samples: i64,
    sample_rate: f64,
    tempo_bpm: f64,
    position_in_beats: f64,
    is_playing: u32,
    loop_enabled: u32,
    loop_start_samples: i64,
    loop_end_samples: i64,
    track_count: u32,
    track_peak: [f32; MAX_TRACKS],
    track_rms: [f32; MAX_TRACKS],
    master_peak_l: f32,
    master_peak_r: f32,
    master_rms_l: f32,
    master_rms_r: f32,
    cpu_load: f64,
    xrun_count: u64,
    callback_count: u64,
    buffer_size: u32,
    dropped_commands: u32,
}

/// Mirrors `musio::MeterBlock`. The sequence word is the seqlock counter; it is
/// read with volatile loads rather than as an atomic because we only ever read
/// it, never write it.
#[repr(C)]
struct RawBlock {
    magic: u32,
    version: u32,
    sequence: u32,
    reserved: u32,
    payload: RawPayload,
}

/// Compile-time check that this file agrees with the C++ side. The values come
/// from the engine's own `sizeof`/`offsetof`.
const fn assert_layout() {
    assert!(std::mem::size_of::<RawPayload>() == 2160);
    assert!(std::mem::size_of::<RawBlock>() == 2176);
}
const _: () = assert_layout();

#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct Meters {
    pub play_head_samples: i64,
    pub sample_rate: f64,
    pub tempo_bpm: f64,
    pub position_in_beats: f64,
    pub is_playing: bool,
    pub loop_enabled: bool,
    pub loop_start_samples: i64,
    pub loop_end_samples: i64,
    pub track_count: u32,
    pub track_peak: Vec<f32>,
    pub track_rms: Vec<f32>,
    pub master_peak_l: f32,
    pub master_peak_r: f32,
    pub cpu_load: f64,
    pub xrun_count: u64,
    pub callback_count: u64,
    pub buffer_size: u32,
    pub dropped_commands: u32,
}

pub struct MeterReader {
    _file: File,
    map: Mmap,
}

impl MeterReader {
    /// `name` is the POSIX shm name the engine reported in `engine.status`.
    pub fn open(name: &str) -> Result<Self, String> {
        let trimmed = name.trim_start_matches('/');
        let path = PathBuf::from(format!("/dev/shm/{trimmed}"));

        let file = File::open(&path)
            .map_err(|e| format!("cannot open {}: {e}", path.display()))?;

        let len = file
            .metadata()
            .map_err(|e| format!("cannot stat {}: {e}", path.display()))?
            .len() as usize;

        if len < std::mem::size_of::<RawBlock>() {
            return Err(format!(
                "telemetry block too small: {len} bytes, expected at least {}",
                std::mem::size_of::<RawBlock>()
            ));
        }

        // SAFETY: the file is at least as large as RawBlock, and the engine only
        // ever writes well-formed payloads into it. A truncated or foreign file
        // is caught by the magic/version check below.
        let map = unsafe { Mmap::map(&file) }
            .map_err(|e| format!("cannot mmap {}: {e}", path.display()))?;

        let reader = Self { _file: file, map };

        let block = reader.block();
        // SAFETY: bounds checked above.
        let (magic, version) = unsafe { ((*block).magic, (*block).version) };
        if magic != MAGIC {
            return Err("telemetry block has wrong magic (not a Musio engine?)".into());
        }
        if version != VERSION {
            return Err(format!(
                "telemetry version mismatch: engine wrote {version}, UI expects {VERSION}"
            ));
        }

        Ok(reader)
    }

    fn block(&self) -> *const RawBlock {
        self.map.as_ptr() as *const RawBlock
    }

    /// Seqlock read side, matching `musio::MeterReader::read`. Returns None if a
    /// tear-free snapshot could not be obtained -- the caller should just wait
    /// for the next frame rather than retry harder.
    pub fn read(&self) -> Option<Meters> {
        let block = self.block();

        for _ in 0..64 {
            // SAFETY: `block` points at a mapping of at least size_of::<RawBlock>().
            // Volatile reads stop the compiler caching the sequence word or
            // hoisting the payload copy outside the two reads of it.
            let before = unsafe { std::ptr::read_volatile(&(*block).sequence) };
            if before & 1 != 0 {
                continue; // writer mid-update
            }

            let payload = unsafe { std::ptr::read_volatile(&(*block).payload) };

            let after = unsafe { std::ptr::read_volatile(&(*block).sequence) };
            if before != after {
                continue;
            }

            let count = (payload.track_count as usize).min(MAX_TRACKS);
            return Some(Meters {
                play_head_samples: payload.play_head_samples,
                sample_rate: payload.sample_rate,
                tempo_bpm: payload.tempo_bpm,
                position_in_beats: payload.position_in_beats,
                is_playing: payload.is_playing != 0,
                loop_enabled: payload.loop_enabled != 0,
                loop_start_samples: payload.loop_start_samples,
                loop_end_samples: payload.loop_end_samples,
                track_count: payload.track_count,
                track_peak: payload.track_peak[..count].to_vec(),
                track_rms: payload.track_rms[..count].to_vec(),
                master_peak_l: payload.master_peak_l,
                master_peak_r: payload.master_peak_r,
                cpu_load: payload.cpu_load,
                xrun_count: payload.xrun_count,
                callback_count: payload.callback_count,
                buffer_size: payload.buffer_size,
                dropped_commands: payload.dropped_commands,
            });
        }

        None
    }
}
