cmake_minimum_required(VERSION 3.22.1)

project(marphighlights LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(MARP_HIGHLIGHTS_ROOT "${CMAKE_SOURCE_DIR}/..")

add_library(
  marphighlights SHARED
  src/main/cpp/cpp-adapter.cpp
  "${MARP_HIGHLIGHTS_ROOT}/cpp/HybridMarpHighlights.cpp"
  "${MARP_HIGHLIGHTS_ROOT}/cpp/Utf16ToUtf8.cpp"
  "${MARP_HIGHLIGHTS_ROOT}/cpp/marp_highlights.c"
  "${MARP_HIGHLIGHTS_ROOT}/Vendor/highlights/highlights.c"
  "${MARP_HIGHLIGHTS_ROOT}/Vendor/wasm2c/wasm-rt-impl.c"
  "${MARP_HIGHLIGHTS_ROOT}/Vendor/wasm2c/wasm-rt-mem-impl.c"
)

include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/marphighlights+autolinking.cmake)

target_include_directories(
  marphighlights
  PRIVATE "${MARP_HIGHLIGHTS_ROOT}/cpp" "${MARP_HIGHLIGHTS_ROOT}/Vendor"
          "${MARP_HIGHLIGHTS_ROOT}/Vendor/highlights" "${MARP_HIGHLIGHTS_ROOT}/Vendor/wasm2c"
)

# Plain malloc memory with explicit bounds checks: no guard-page signal
# handlers competing with ART's.
target_compile_definitions(
  marphighlights PRIVATE WASM_RT_USE_MMAP=0 WASM_RT_MEMCHECK_BOUNDS_CHECK=1
                       WASM_RT_SKIP_SIGNAL_RECOVERY=1
)

# The lexers are generated code; keep them fast in debug builds too.
target_compile_options(marphighlights PRIVATE -O2)

target_link_options(
  marphighlights PRIVATE "-Wl,-z,common-page-size=16384" "-Wl,-z,max-page-size=16384"
)
