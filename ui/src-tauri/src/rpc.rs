//! JSON-RPC client for the engine's Unix socket.
//!
//! The web layer cannot open a Unix socket, so the Rust shell owns the
//! connection and exposes it as a Tauri command. It reconnects lazily: the
//! engine may be started after the UI, or restarted underneath it, and neither
//! should require reloading the window.

use std::io::{BufRead, BufReader, Write};
use std::os::unix::net::UnixStream;
use std::time::Duration;

use serde_json::{json, Value};

pub struct RpcClient {
    socket_path: String,
    stream: Option<BufReader<UnixStream>>,
    next_id: u64,
}

impl RpcClient {
    pub fn new(socket_path: String) -> Self {
        Self {
            socket_path,
            stream: None,
            next_id: 1,
        }
    }

    pub fn socket_path(&self) -> &str {
        &self.socket_path
    }

    pub fn set_socket_path(&mut self, path: String) {
        if path != self.socket_path {
            self.socket_path = path;
            self.stream = None;
        }
    }

    fn connect(&mut self) -> Result<(), String> {
        if self.stream.is_some() {
            return Ok(());
        }

        let stream = UnixStream::connect(&self.socket_path).map_err(|e| {
            format!(
                "cannot reach the engine at {}: {e}. Start it with: musio-engine --serve",
                self.socket_path
            )
        })?;

        // A hung engine must not freeze the UI thread indefinitely.
        stream
            .set_read_timeout(Some(Duration::from_secs(10)))
            .map_err(|e| format!("cannot set read timeout: {e}"))?;
        stream
            .set_write_timeout(Some(Duration::from_secs(5)))
            .map_err(|e| format!("cannot set write timeout: {e}"))?;

        self.stream = Some(BufReader::new(stream));
        Ok(())
    }

    pub fn call(&mut self, method: &str, params: Value) -> Result<Value, String> {
        // One transparent retry: the common failure is a stale socket from an
        // engine that restarted, and reconnecting fixes it.
        match self.try_call(method, &params) {
            Ok(value) => Ok(value),
            Err(first) => {
                self.stream = None;
                self.try_call(method, &params).map_err(|second| {
                    if first == second {
                        first
                    } else {
                        format!("{first} (after reconnect: {second})")
                    }
                })
            }
        }
    }

    fn try_call(&mut self, method: &str, params: &Value) -> Result<Value, String> {
        self.connect()?;

        let id = self.next_id;
        self.next_id += 1;

        let mut request = json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
        })
        .as_object()
        .cloned()
        .expect("literal is an object");

        if !params.is_null() {
            request.insert("params".into(), params.clone());
        }

        let mut line = Value::Object(request).to_string();
        line.push('\n');

        let reader = self
            .stream
            .as_mut()
            .ok_or_else(|| "not connected".to_string())?;

        reader
            .get_mut()
            .write_all(line.as_bytes())
            .map_err(|e| format!("send failed: {e}"))?;
        reader
            .get_mut()
            .flush()
            .map_err(|e| format!("flush failed: {e}"))?;

        let mut response_line = String::new();
        let read = reader
            .read_line(&mut response_line)
            .map_err(|e| format!("read failed: {e}"))?;

        if read == 0 {
            return Err("engine closed the connection".into());
        }

        let response: Value = serde_json::from_str(response_line.trim())
            .map_err(|e| format!("malformed response: {e}"))?;

        if let Some(error) = response.get("error") {
            let message = error
                .get("message")
                .and_then(Value::as_str)
                .unwrap_or("unknown engine error");
            return Err(message.to_string());
        }

        Ok(response
            .get("result")
            .cloned()
            .unwrap_or(Value::Null))
    }
}
