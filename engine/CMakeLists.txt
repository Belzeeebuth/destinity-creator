# The only place in the build that knows JUCE exists.
#
# musio-core is deliberately not linked against JUCE: if a future change makes
# core need a JUCE header, that is the signal that platform-specific typing has
# leaked back into the portable layer -- the exact defect that stalled the
# upstream Windows port.

if(NOT EXISTS "${MUSIO_THIRD_PARTY}/JUCE/CMakeLists.txt")
  message(FATAL_ERROR "third_party/JUCE missing. Run scripts/bootstrap.sh first.")
endif()

add_subdirectory("${MUSIO_THIRD_PARTY}/JUCE" juce EXCLUDE_FROM_ALL)

juce_add_console_app(musio-engine
  PRODUCT_NAME "Musio Engine"
  COMPANY_NAME "Musio"
)

target_sources(musio-engine PRIVATE
  src/main.cpp
  src/AudioBackend.cpp
  src/AudioFileCache.cpp
  src/PluginHost.cpp
  src/RpcServer.cpp
  src/EngineService.cpp
)

target_include_directories(musio-engine PRIVATE src)

juce_generate_juce_header(musio-engine)

target_compile_definitions(musio-engine PRIVATE
  JUCE_STANDALONE_APPLICATION=1
  JUCE_USE_CURL=0
  JUCE_WEB_BROWSER=0
  JUCE_MODAL_LOOPS_PERMITTED=0

  # Linux audio backends. JACK first: on a modern desktop PipeWire implements
  # the JACK API, so one backend covers PipeWire, JACK and (through
  # pipewire-pulse) PulseAudio users. ALSA stays as the direct-hardware
  # fallback for machines with no session audio server.
  JUCE_JACK=1
  JUCE_ALSA=1

  # VST3 is the format with real Linux vendor support, so it is the baseline
  # here -- the mirror image of AudioUnit being baseline on macOS.
  JUCE_PLUGINHOST_VST3=1
  JUCE_PLUGINHOST_LV2=1
  JUCE_PLUGINHOST_AU=0
)

target_link_libraries(musio-engine PRIVATE
  musio-core
  juce::juce_audio_devices
  juce::juce_audio_formats
  juce::juce_audio_processors
  juce::juce_audio_utils
  juce::juce_core
  juce::juce_events
  PUBLIC
  juce::juce_recommended_config_flags
  juce::juce_recommended_warning_flags
)
