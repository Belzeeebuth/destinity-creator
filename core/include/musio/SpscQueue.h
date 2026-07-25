// Lock-free single-producer / single-consumer ring buffer.
//
// This is the only channel by which the control plane may speak to the audio
// thread. Constraints it enforces by construction:
//   * fixed capacity, allocated once up front  -> no allocation while running
//   * trivially copyable payloads only         -> no destructors, no heap
//   * acquire/release atomics only             -> no mutex, no syscall
//
// The macOS original had the right idea in RingBuffer.swift but put it on the
// wrong side of the boundary; this lives in the dependency-free core so both
// the engine and the tests exercise the exact same code.
#pragma once

#include <atomic>
#include <cstddef>
#include <new>
#include <type_traits>
#include <vector>

namespace musio {

// Hardcoded rather than std::hardware_destructive_interference_size: that
// constant is ABI-sensitive and GCC warns when it appears in a header shared
// across translation units. 64 is correct on x86-64 and aarch64 alike.
inline constexpr std::size_t kCacheLine = 64;

template <typename T>
class SpscQueue {
  static_assert(std::is_trivially_copyable_v<T>,
                "SpscQueue payloads must be trivially copyable: the audio thread "
                "must never run a destructor or touch the heap.");

 public:
  /// `capacity` is rounded up to a power of two. One slot is reserved to
  /// distinguish full from empty, so usable capacity is (rounded - 1).
  explicit SpscQueue(std::size_t capacity) {
    std::size_t n = 2;
    while (n < capacity + 1) n <<= 1;
    slots_.resize(n);
    mask_ = n - 1;
  }

  SpscQueue(const SpscQueue&) = delete;
  SpscQueue& operator=(const SpscQueue&) = delete;

  /// Producer side (control thread). Returns false if the queue is full; the
  /// caller decides whether to drop or retry. Never blocks.
  bool push(const T& item) noexcept {
    const std::size_t w = write_.load(std::memory_order_relaxed);
    const std::size_t next = (w + 1) & mask_;
    if (next == read_.load(std::memory_order_acquire)) return false;  // full
    slots_[w] = item;
    write_.store(next, std::memory_order_release);
    return true;
  }

  /// Consumer side (audio thread). Returns false if empty. Never blocks,
  /// never allocates.
  bool pop(T& out) noexcept {
    const std::size_t r = read_.load(std::memory_order_relaxed);
    if (r == write_.load(std::memory_order_acquire)) return false;  // empty
    out = slots_[r];
    read_.store((r + 1) & mask_, std::memory_order_release);
    return true;
  }

  bool empty() const noexcept {
    return read_.load(std::memory_order_acquire) == write_.load(std::memory_order_acquire);
  }

  std::size_t sizeApprox() const noexcept {
    const std::size_t w = write_.load(std::memory_order_acquire);
    const std::size_t r = read_.load(std::memory_order_acquire);
    return (w - r) & mask_;
  }

  std::size_t capacity() const noexcept { return mask_; }

 private:
  std::vector<T> slots_;
  std::size_t mask_ = 0;
  alignas(kCacheLine) std::atomic<std::size_t> write_{0};
  alignas(kCacheLine) std::atomic<std::size_t> read_{0};
};

}  // namespace musio
