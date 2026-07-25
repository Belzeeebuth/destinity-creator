#!/usr/bin/env python3
"""End-to-end audio clip playback check.

Builds a probe WAV with three distinct DC regions plus a project that references
it five different ways, renders offline, and asserts the exact sample values.

The point of the DC regions is that a rendered sample identifies precisely which
source frame it came from, so this verifies clip placement, source offsets,
looping, fade curves, mute and the gain/pan chain numerically rather than by
eyeballing a waveform. It runs anywhere, including CI with no sound card,
because it goes through the engine's --render path.

Usage: scripts/e2e-clips.py <path-to-musio-engine> [workdir]
"""

import json
import math
import os
import struct
import subprocess
import sys
import uuid
import wave

SR = 48000
PAN = math.cos(math.pi / 4)  # equal-power centre pan == sin(pi/4) == 0.70710678
# int16 output quantises at 1/32768 == 3.05e-5, so the tolerance sits just above.
TOL = 2e-4


def build_probe(path):
    """Silence, then +0.5, then -0.25, then silence -- 1000 frames each."""
    frames = [0.0] * 1000 + [0.5] * 1000 + [-0.25] * 1000 + [0.0] * 1000
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<hh", int(v * 32767), int(v * 32767))
                               for v in frames))
    return len(frames)


def build_project(path, probe_frames):
    file_id = str(uuid.uuid4()).upper()

    def wrapped():
        # Swift wraps single-property id structs, so TrackID/ClipID encode as
        # {"rawValue": "..."} rather than a bare string.
        return {"rawValue": str(uuid.uuid4()).upper()}

    def fileref():
        return {
            "fileID": file_id,
            "originalPath": "/Users/nobody/probe.wav",
            "relativePath": "Audio Files/probe.wav",
            "sampleRate": SR,
            "channelCount": 2,
            "lengthInSamples": probe_frames,
            "bitDepth": 16,
        }

    def clip(name, start, dur, src_off, src_len, looped=False, fin=0, fout=0,
             curve="linear"):
        return {
            "id": wrapped(), "name": name, "isSelected": False,
            "isLooped": looped, "isMuted": False,
            "fadeInDuration": fin, "fadeOutDuration": fout,
            "fadeInCurve": curve, "fadeOutCurve": curve,
            "timeRange": {
                "start": {"samples": start, "sampleRate": SR},
                "duration": {"samples": dur, "sampleRate": SR},
            },
            # Swift synthesises enum payloads with an "_0" key.
            "content": {"audio": {"_0": {
                "fileReference": fileref(),
                "sourceStartSample": src_off,
                "sourceLengthSamples": src_len,
                "pitchShift": 0, "timeStretch": 1,
                "preservePitch": True, "warpMarkers": [],
            }}},
        }

    def track(name, clips, vol=1.0, pan=0.0, muted=False, kind="audio"):
        return {
            "id": wrapped(), "name": name, "type": kind, "color": "blue",
            "volume": vol, "pan": pan, "isMuted": muted, "isSolo": False,
            "isArmed": False, "height": 80, "isExpanded": True,
            "isAutomationVisible": False, "automationLanes": [],
            "clips": clips, "pluginSlots": [],
        }

    project = {
        "id": str(uuid.uuid4()).upper(), "name": "E2E Clips",
        "createdAt": "2026-07-25T00:00:00Z", "modifiedAt": "2026-07-25T00:00:00Z",
        "tempo": {"bpm": 120},
        "timeSignature": {"numerator": 4, "denominator": 4},
        "tempoChanges": [], "timeSignatureChanges": [],
        "sampleRate": SR, "formatVersion": 1,
        "isLoopEnabled": False, "markers": [],
        "audioFiles": [fileref()],
        "metadata": {"artist": "", "album": "", "genre": "",
                     "comments": "", "copyright": ""},
        "tracks": [
            track("Plain", [clip("plain", 5000, 1000, 1000, 1000)]),
            track("Looped", [clip("loop", 20000, 2500, 1000, 1000, looped=True)]),
            track("Faded", [clip("fade", 30000, 1000, 1000, 1000, fin=500, fout=500)]),
            track("Muted", [clip("mute", 40000, 1000, 1000, 1000)], muted=True),
            track("Neg", [clip("neg", 50000, 1000, 2000, 1000)]),
        ],
        "masterTrack": track("Master", [], kind="master"),
    }

    with open(path, "w") as f:
        json.dump(project, f, indent=2, sort_keys=True)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2

    engine = sys.argv[1]
    workdir = sys.argv[2] if len(sys.argv) > 2 else "/tmp/musio-e2e"

    os.makedirs(os.path.join(workdir, "Audio Files"), exist_ok=True)
    probe_frames = build_probe(os.path.join(workdir, "Audio Files", "probe.wav"))

    project_path = os.path.join(workdir, "e2e.musio")
    build_project(project_path, probe_frames)

    out_path = os.path.join(workdir, "out.wav")
    result = subprocess.run(
        [engine, "--render", out_path, "--project", project_path, "--seconds", "1.5"],
        capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr, file=sys.stderr)
        print("FAIL: engine exited nonzero")
        return 1

    with wave.open(out_path, "rb") as w:
        n, ch = w.getnframes(), w.getnchannels()
        data = struct.unpack("<%dh" % (n * ch), w.readframes(n))
    left = [v / 32768 for v in data[0::ch]]

    expect = 0.5 * PAN     # +0.5 source through unity track gain and centre pan
    negative = -0.25 * PAN
    failures = []

    def check(label, index, wanted, tol=TOL):
        got = left[index]
        ok = abs(got - wanted) <= tol
        status = "ok  " if ok else "FAIL"
        print(f"  {status} {label:34s} sample {index:6d}: "
              f"{got:+.5f} (expect {wanted:+.5f})")
        if not ok:
            failures.append(label)

    print("T0 plain placement at 5000, reading source 1000..1999 (+0.5)")
    check("silent before clip", 4999, 0.0)
    check("first sample of clip", 5000, expect)
    check("mid clip", 5500, expect)
    check("last sample of clip", 5999, expect)
    check("silent after clip", 6000, 0.0)

    print("T1 looped: 2500 timeline frames over 1000 source frames")
    check("loop pass 1", 20500, expect)
    check("loop pass 2", 21500, expect)
    check("loop pass 3 (partial)", 22400, expect)
    check("silent after loop", 22500, 0.0)

    print("T2 linear fade in 500 / out 500 over 1000 frames")
    check("fade start (silent)", 30000, 0.0)
    check("fade in 25%", 30125, expect * 0.25)
    check("fade in 50%", 30250, expect * 0.50)
    check("fade peak", 30500, expect)
    check("fade out 50%", 30750, expect * 0.50)
    check("fade out near end", 30999, expect * 0.002, tol=1e-3)

    print("T3 muted track")
    check("muted is silent", 40500, 0.0)

    print("T4 negative source region (-0.25)")
    check("negative DC", 50500, negative)

    print()
    if failures:
        print(f"FAILED: {len(failures)} check(s): {', '.join(failures)}")
        return 1
    print("ALL CHECKS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
