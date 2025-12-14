#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace ConverterCore {

struct ConvertOptions {
  std::string format{"opus"};
  int64_t bitrate{64000};
  int channels{2};
  int sampleRate{48000};
  bool ptt{false};
  bool vbr{true};

  void validate() {
    if (channels < 1)
      channels = 1;
    if (channels > 2)
      channels = 2;
    if (sampleRate < 8000)
      sampleRate = 8000;
    if (sampleRate > 96000)
      sampleRate = 96000;
    if (bitrate < 8000)
      bitrate = 8000;
    if (bitrate > 320000)
      bitrate = 320000;

    if (format == "ogg" || format == "ogg_opus" || format == "opus_ogg") {
      format = "opus";
    }
  }

  bool isValidFormat() const {
    return format == "opus" || format == "mp3" || format == "aac" ||
           format == "m4a" || format == "wav";
  }
};

struct ConvertResult {
  std::vector<uint8_t> data;
  std::string error;
  bool success{false};

  ConvertResult() = default;
  ConvertResult(std::vector<uint8_t> &&d) : data(std::move(d)), success(true) {}
  ConvertResult(const std::string &err) : error(err), success(false) {}
};

ConvertResult ConvertAudio(const uint8_t *input_data, size_t input_size,
                           const ConvertOptions &options) noexcept;

int64_t ParseBitrate(const std::string &bitrate_str,
                     int64_t default_value) noexcept;

} // namespace ConverterCore