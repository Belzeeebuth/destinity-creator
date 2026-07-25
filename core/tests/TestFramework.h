// A ~100 line test harness. Deliberately not gtest: musio-core has no
// dependencies and the tests are the thing that proves it, so pulling in a
// framework here would undercut the point.
#pragma once

#include <cmath>
#include <cstdio>
#include <functional>
#include <string>
#include <vector>

namespace musio::test {

struct TestCase {
  std::string suite;
  std::string name;
  std::function<void()> fn;
};

std::vector<TestCase>& registry();

struct Registrar {
  Registrar(const char* suite, const char* name, std::function<void()> fn) {
    registry().push_back({suite, name, std::move(fn)});
  }
};

struct Failure {
  std::string message;
};

inline void fail(const std::string& where, const std::string& what) {
  throw Failure{where + ": " + what};
}

}  // namespace musio::test

#define MUSIO_TEST(suite_, name_)                                                    \
  static void suite_##_##name_();                                                    \
  static const ::musio::test::Registrar reg_##suite_##_##name_{#suite_, #name_,       \
                                                               suite_##_##name_};    \
  static void suite_##_##name_()

#define MUSIO_AT (std::string(__FILE__) + ":" + std::to_string(__LINE__))

#define CHECK(cond)                                                                  \
  do {                                                                               \
    if (!(cond)) ::musio::test::fail(MUSIO_AT, "CHECK failed: " #cond);               \
  } while (0)

#define CHECK_EQ(a, b)                                                               \
  do {                                                                               \
    const auto va_ = (a);                                                            \
    const auto vb_ = (b);                                                            \
    if (!(va_ == vb_)) {                                                             \
      ::musio::test::fail(MUSIO_AT, "CHECK_EQ failed: " #a " == " #b " (" +           \
                                        std::to_string(va_) + " vs " +               \
                                        std::to_string(vb_) + ")");                  \
    }                                                                                \
  } while (0)

#define CHECK_NEAR(a, b, tol)                                                        \
  do {                                                                               \
    const double va_ = static_cast<double>(a);                                        \
    const double vb_ = static_cast<double>(b);                                        \
    if (std::fabs(va_ - vb_) > (tol)) {                                              \
      ::musio::test::fail(MUSIO_AT, "CHECK_NEAR failed: " #a " ~= " #b " (" +         \
                                        std::to_string(va_) + " vs " +               \
                                        std::to_string(vb_) + ")");                  \
    }                                                                                \
  } while (0)

#define CHECK_STR_EQ(a, b)                                                           \
  do {                                                                               \
    const std::string va_ = (a);                                                     \
    const std::string vb_ = (b);                                                     \
    if (va_ != vb_) {                                                                \
      ::musio::test::fail(MUSIO_AT,                                                  \
                          "CHECK_STR_EQ failed: \"" + va_ + "\" vs \"" + vb_ + "\"");\
    }                                                                                \
  } while (0)
