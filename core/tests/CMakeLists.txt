add_executable(musio-core-tests
  TestMain.cpp
  test_transport.cpp
  test_metronome.cpp
  test_spsc.cpp
  test_meterring.cpp
  test_persistence.cpp
  test_engine.cpp
  test_clipplayer.cpp
)

target_link_libraries(musio-core-tests PRIVATE musio-core pthread rt)

target_compile_definitions(musio-core-tests PRIVATE
  MUSIO_FIXTURE_DIR="${CMAKE_CURRENT_SOURCE_DIR}/fixtures"
)

target_compile_options(musio-core-tests PRIVATE -Wall -Wextra)

# One CTest entry per suite so a failure names the area, not just "tests".
foreach(suite transport metronome spsc meterring persistence uuid engine wav clip)
  add_test(NAME core.${suite} COMMAND musio-core-tests ${suite})
endforeach()
