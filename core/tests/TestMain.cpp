#include "TestFramework.h"

#include <cstring>
#include <exception>

namespace musio::test {

std::vector<TestCase>& registry() {
  static std::vector<TestCase> cases;
  return cases;
}

}  // namespace musio::test

int main(int argc, char** argv) {
  const char* onlySuite = (argc > 1) ? argv[1] : nullptr;

  int run = 0;
  int failed = 0;

  for (const auto& tc : musio::test::registry()) {
    if (onlySuite != nullptr && tc.suite != onlySuite) continue;
    ++run;
    try {
      tc.fn();
      std::printf("  ok    %s.%s\n", tc.suite.c_str(), tc.name.c_str());
    } catch (const musio::test::Failure& f) {
      std::printf("  FAIL  %s.%s\n        %s\n", tc.suite.c_str(), tc.name.c_str(),
                  f.message.c_str());
      ++failed;
    } catch (const std::exception& e) {
      std::printf("  FAIL  %s.%s\n        unexpected exception: %s\n", tc.suite.c_str(),
                  tc.name.c_str(), e.what());
      ++failed;
    }
  }

  if (onlySuite != nullptr && run == 0) {
    std::printf("no tests matched suite '%s'\n", onlySuite);
    return 2;
  }

  std::printf("\n%d run, %d failed\n", run, failed);
  return failed == 0 ? 0 : 1;
}
