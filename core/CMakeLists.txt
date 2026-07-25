add_library(musio-core STATIC
  src/Transport.cpp
  src/Metronome.cpp
  src/CoreEngine.cpp
  src/MeterRing.cpp
  src/Models.cpp
  src/Persistence.cpp
  src/Uuid.cpp
)

target_include_directories(musio-core PUBLIC include)

# musio-core links exactly two things: the JSON header (control plane only)
# and librt/pthread for the POSIX shared-memory meter ring. No JUCE, no JACK,
# no X11. If this list ever grows an audio or GUI dependency, the layering
# has been violated.
target_link_libraries(musio-core PUBLIC musio_json PRIVATE pthread rt)

target_compile_options(musio-core PRIVATE
  -Wall -Wextra -Wpedantic -Wshadow
  $<$<CONFIG:RelWithDebInfo>:-O2>
  $<$<CONFIG:Release>:-O3>
)
