#include "TestFramework.h"
#include "musio/Command.h"
#include "musio/SpscQueue.h"

#include <atomic>
#include <thread>
#include <vector>

using namespace musio;

MUSIO_TEST(spsc, push_pop_preserves_order) {
  SpscQueue<Command> q(64);
  for (int i = 0; i < 32; ++i) {
    Command c = Command::make(CommandType::Seek);
    c.i64a = i;
    CHECK(q.push(c));
  }
  for (int i = 0; i < 32; ++i) {
    Command c;
    CHECK(q.pop(c));
    CHECK_EQ(c.i64a, i);
    CHECK(c.type == CommandType::Seek);
  }
  Command drained;
  CHECK(!q.pop(drained));
  CHECK(q.empty());
}

MUSIO_TEST(spsc, capacity_is_rounded_to_power_of_two) {
  SpscQueue<Command> q(100);
  // 100 + 1 rounds up to 128, one slot reserved -> 127 usable.
  CHECK_EQ(static_cast<int>(q.capacity()), 127);
}

MUSIO_TEST(spsc, push_fails_when_full_instead_of_blocking) {
  SpscQueue<Command> q(8);  // 8 usable slots after rounding to 16 - 1 = 15
  const int usable = static_cast<int>(q.capacity());

  int pushed = 0;
  while (q.push(Command::make(CommandType::Play))) ++pushed;
  CHECK_EQ(pushed, usable);

  // The queue must refuse rather than overwrite or block.
  CHECK(!q.push(Command::make(CommandType::Play)));

  Command c;
  CHECK(q.pop(c));
  CHECK(q.push(Command::make(CommandType::Stop)));
}

MUSIO_TEST(spsc, threaded_producer_consumer_loses_nothing) {
  SpscQueue<Command> q(1024);
  constexpr int kTotal = 200000;

  std::atomic<bool> producerDone{false};
  std::vector<std::int64_t> received;
  received.reserve(kTotal);

  std::thread producer([&] {
    for (int i = 0; i < kTotal; ++i) {
      Command c = Command::make(CommandType::Seek);
      c.i64a = i;
      // Spin on backpressure -- fine in a test, never on the audio thread.
      while (!q.push(c)) std::this_thread::yield();
    }
    producerDone.store(true, std::memory_order_release);
  });

  while (true) {
    Command c;
    if (q.pop(c)) {
      received.push_back(c.i64a);
    } else if (producerDone.load(std::memory_order_acquire) && q.empty()) {
      break;
    }
  }

  producer.join();

  CHECK_EQ(static_cast<int>(received.size()), kTotal);
  for (int i = 0; i < kTotal; ++i) CHECK_EQ(received[static_cast<std::size_t>(i)], i);
}

MUSIO_TEST(spsc, command_stays_pod_and_small) {
  // These are the invariants that keep the audio thread allocation-free. If a
  // future field breaks them the build should fail here, not in production.
  CHECK(std::is_trivially_copyable_v<Command>);
  CHECK(sizeof(Command) <= 64);
  CHECK(std::is_trivially_copyable_v<ScheduledMidiEvent>);
}

MUSIO_TEST(spsc, scheduled_midi_helpers_encode_status_bytes) {
  const auto on = ScheduledMidiEvent::noteOn(3, 1000, 60, 100, 2);
  CHECK_EQ(static_cast<int>(on.status), 0x92);
  CHECK_EQ(static_cast<int>(on.data1), 60);
  CHECK_EQ(static_cast<int>(on.data2), 100);
  CHECK_EQ(on.samplePosition, 1000);
  CHECK_EQ(static_cast<int>(on.slot), 3);

  const auto off = ScheduledMidiEvent::noteOff(3, 2000, 60, 2);
  CHECK_EQ(static_cast<int>(off.status), 0x82);
  CHECK_EQ(static_cast<int>(off.data2), 0);

  CHECK(on < off);
}
