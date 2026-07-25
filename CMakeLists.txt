cmake_minimum_required(VERSION 3.22)
project(MusioLinux VERSION 0.1.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
  set(CMAKE_BUILD_TYPE RelWithDebInfo CACHE STRING "" FORCE)
endif()

option(MUSIO_BUILD_ENGINE "Build the JUCE-backed audio engine executable" ON)
option(MUSIO_BUILD_TESTS  "Build musio-core unit tests" ON)

set(MUSIO_THIRD_PARTY "${CMAKE_CURRENT_SOURCE_DIR}/third_party")

# ---------------------------------------------------------------------------
# nlohmann/json (single header, used by the control plane -- never by the
# realtime audio path).
# ---------------------------------------------------------------------------
if(NOT EXISTS "${MUSIO_THIRD_PARTY}/nlohmann/json.hpp")
  message(FATAL_ERROR "third_party/json.hpp missing. Run scripts/bootstrap.sh first.")
endif()

add_library(musio_json INTERFACE)
target_include_directories(musio_json INTERFACE "${MUSIO_THIRD_PARTY}")

# ---------------------------------------------------------------------------
# musio-core: pure C++20, no audio/GUI/framework dependency at all.
# This is the layer that is fully unit-testable without a sound device, and
# the reason the Linux port is tractable: the realtime logic never touches a
# platform API.
# ---------------------------------------------------------------------------
add_subdirectory(core)

if(MUSIO_BUILD_TESTS)
  enable_testing()
  add_subdirectory(core/tests)
endif()

if(MUSIO_BUILD_ENGINE)
  add_subdirectory(engine)
endif()

message(STATUS "")
message(STATUS "Musio (Linux) ${PROJECT_VERSION}")
message(STATUS "  build type : ${CMAKE_BUILD_TYPE}")
message(STATUS "  engine     : ${MUSIO_BUILD_ENGINE}")
message(STATUS "  tests      : ${MUSIO_BUILD_TESTS}")
message(STATUS "")
