// Musio UI shell.
//
// The shell exists for one reason: a webview cannot open a Unix socket or mmap
// shared memory, and those are the two channels the engine speaks. Everything
// else -- layout, interaction, drawing -- lives in the web layer.
//
// Deliberately thin. No audio, no DSP, no project logic: the engine owns all of
// that, so a UI crash cannot glitch or stop playback.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod meters;
mod rpc;

use std::sync::Mutex;

use serde_json::Value;
use tauri::State;

use meters::{MeterReader, Meters};
use rpc::RpcClient;

struct AppState {
    rpc: Mutex<RpcClient>,
    meters: Mutex<Option<MeterReader>>,
}

fn default_socket_path() -> String {
    std::env::var("MUSIO_SOCKET").unwrap_or_else(|_| {
        match std::env::var("XDG_RUNTIME_DIR") {
            Ok(dir) if !dir.is_empty() => format!("{dir}/musio-engine.sock"),
            _ => "/tmp/musio-engine.sock".to_string(),
        }
    })
}

/// Forward one JSON-RPC call to the engine.
#[tauri::command]
fn rpc(
    method: String,
    params: Option<Value>,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let mut client = state
        .rpc
        .lock()
        .map_err(|_| "rpc client mutex poisoned".to_string())?;

    client.call(&method, params.unwrap_or(Value::Null))
}

/// Read one telemetry snapshot. Attaches to the shared-memory block on first use,
/// asking the engine where it lives.
#[tauri::command]
fn meters(state: State<'_, AppState>) -> Result<Meters, String> {
    {
        let guard = state
            .meters
            .lock()
            .map_err(|_| "meter mutex poisoned".to_string())?;
        if let Some(reader) = guard.as_ref() {
            if let Some(snapshot) = reader.read() {
                return Ok(snapshot);
            }
            // A failed read means the writer was busy, not that the mapping is
            // stale -- just skip this frame.
            return Err("no tear-free snapshot this frame".into());
        }
    }

    // Not attached yet: ask the engine for the segment name and map it.
    let shm_name = {
        let mut client = state
            .rpc
            .lock()
            .map_err(|_| "rpc client mutex poisoned".to_string())?;
        let info = client.call("meters.info", Value::Null)?;
        info.get("shmName")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string()
    };

    if shm_name.is_empty() {
        return Err("engine is not publishing telemetry".into());
    }

    let reader = MeterReader::open(&shm_name)?;
    let snapshot = reader
        .read()
        .ok_or_else(|| "attached, but no snapshot yet".to_string())?;

    let mut guard = state
        .meters
        .lock()
        .map_err(|_| "meter mutex poisoned".to_string())?;
    *guard = Some(reader);

    Ok(snapshot)
}

/// Where the shell is looking for the engine, so the UI can show it in an error.
#[tauri::command]
fn socket_path(state: State<'_, AppState>) -> Result<String, String> {
    let client = state
        .rpc
        .lock()
        .map_err(|_| "rpc client mutex poisoned".to_string())?;
    Ok(client.socket_path().to_string())
}

/// Point the shell at a different engine socket. Changing it drops both the RPC
/// connection and the telemetry mapping, so the next call re-attaches to the new
/// engine rather than silently reading the old one's meters.
#[tauri::command]
fn set_socket_path(path: String, state: State<'_, AppState>) -> Result<(), String> {
    {
        let mut client = state
            .rpc
            .lock()
            .map_err(|_| "rpc client mutex poisoned".to_string())?;
        client.set_socket_path(path);
    }
    reattach(state)
}

/// Drop the telemetry mapping so the next `meters` call re-attaches. Used after
/// the engine restarts.
#[tauri::command]
fn reattach(state: State<'_, AppState>) -> Result<(), String> {
    let mut guard = state
        .meters
        .lock()
        .map_err(|_| "meter mutex poisoned".to_string())?;
    *guard = None;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            rpc: Mutex::new(RpcClient::new(default_socket_path())),
            meters: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            rpc,
            meters,
            socket_path,
            set_socket_path,
            reattach
        ])
        .run(tauri::generate_context!())
        .expect("error while running Musio UI");
}
