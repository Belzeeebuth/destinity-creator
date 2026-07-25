#include <algorithm>
#include <cstdio>
#include <random>

#include "musio/Types.h"

namespace musio {

namespace {

int hexValue(char c) noexcept {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  return -1;
}

}  // namespace

bool Uuid::isNil() const noexcept {
  return std::all_of(bytes.begin(), bytes.end(), [](std::uint8_t b) { return b == 0; });
}

std::string Uuid::toString() const {
  // Uppercase, hyphenated: this is what Foundation's JSONEncoder writes, and
  // matching it byte for byte is what lets a project written by the macOS app
  // round-trip through here unchanged.
  static constexpr char kHex[] = "0123456789ABCDEF";
  std::string out;
  out.reserve(36);
  for (int i = 0; i < 16; ++i) {
    if (i == 4 || i == 6 || i == 8 || i == 10) out.push_back('-');
    out.push_back(kHex[(bytes[static_cast<std::size_t>(i)] >> 4) & 0x0F]);
    out.push_back(kHex[bytes[static_cast<std::size_t>(i)] & 0x0F]);
  }
  return out;
}

Uuid Uuid::random() {
  static thread_local std::mt19937_64 rng{std::random_device{}()};
  Uuid u;
  std::uint64_t hi = rng();
  std::uint64_t lo = rng();
  for (int i = 0; i < 8; ++i) {
    u.bytes[static_cast<std::size_t>(i)] = static_cast<std::uint8_t>((hi >> (8 * i)) & 0xFF);
    u.bytes[static_cast<std::size_t>(i + 8)] = static_cast<std::uint8_t>((lo >> (8 * i)) & 0xFF);
  }
  // RFC 4122 version 4 / variant bits.
  u.bytes[6] = static_cast<std::uint8_t>((u.bytes[6] & 0x0F) | 0x40);
  u.bytes[8] = static_cast<std::uint8_t>((u.bytes[8] & 0x3F) | 0x80);
  return u;
}

bool Uuid::parse(std::string_view text, Uuid& out) noexcept {
  // Tolerant of case, surrounding braces, and missing hyphens.
  if (text.size() >= 2 && text.front() == '{' && text.back() == '}') {
    text = text.substr(1, text.size() - 2);
  }

  int nibbles[32];
  int n = 0;
  for (char c : text) {
    if (c == '-') continue;
    const int v = hexValue(c);
    if (v < 0) return false;
    if (n >= 32) return false;
    nibbles[n++] = v;
  }
  if (n != 32) return false;

  Uuid u;
  for (int i = 0; i < 16; ++i) {
    u.bytes[static_cast<std::size_t>(i)] =
        static_cast<std::uint8_t>((nibbles[i * 2] << 4) | nibbles[i * 2 + 1]);
  }
  out = u;
  return true;
}

Uuid Uuid::parseOrNil(std::string_view text) noexcept {
  Uuid u;
  if (!parse(text, u)) return Uuid{};
  return u;
}

}  // namespace musio
