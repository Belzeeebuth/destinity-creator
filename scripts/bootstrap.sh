#!/usr/bin/env bash
# Fetch third-party dependencies. Nothing here is committed to the repo.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TP="$ROOT/third_party"
mkdir -p "$TP"

JUCE_TAG="8.0.6"
CLAP_TAG="1.2.2"
JSON_TAG="v3.11.3"

clone_pinned() {
  local url="$1" tag="$2" dir="$3"
  if [[ -d "$dir/.git" ]]; then
    echo "== $(basename "$dir") already present, skipping"
    return
  fi
  echo "== cloning $(basename "$dir") @ $tag"
  git clone --depth 1 --branch "$tag" "$url" "$dir"
}

clone_pinned https://github.com/juce-framework/JUCE.git   "$JUCE_TAG" "$TP/JUCE"
clone_pinned https://github.com/free-audio/clap.git       "$CLAP_TAG" "$TP/clap"

if [[ ! -f "$TP/nlohmann/json.hpp" ]]; then
  echo "== downloading nlohmann/json $JSON_TAG"
  mkdir -p "$TP/nlohmann"
  curl -sSL -o "$TP/nlohmann/json.hpp" \
    "https://raw.githubusercontent.com/nlohmann/json/$JSON_TAG/single_include/nlohmann/json.hpp"
fi

echo
echo "Dependencies ready in $TP"
echo "Next: cmake -B build -G Ninja && cmake --build build"
