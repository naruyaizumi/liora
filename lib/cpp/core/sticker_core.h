#pragma once

#include <cstdint>
#include <memory>
#include <optional>
#include <string>
#include <vector>

namespace StickerCore {

struct StickerOptions {
  bool crop{false};
  int quality{80};
  int fps{15};
  int maxDuration{15};
  std::string packName;
  std::string authorName;
  std::vector<std::string> emojis;

  void validate() {
    if (quality < 1)
      quality = 1;
    if (quality > 100)
      quality = 100;
    if (fps < 1)
      fps = 1;
    if (fps > 30)
      fps = 30;
    if (maxDuration < 1)
      maxDuration = 1;
    if (maxDuration > 60)
      maxDuration = 60;
  }
};

struct StickerResult {
  std::vector<uint8_t> data;
  std::string error;
  bool success{false};

  StickerResult() = default;
  StickerResult(std::vector<uint8_t> &&d) : data(std::move(d)), success(true) {}
  StickerResult(const std::string &err) : error(err), success(false) {}
};

struct RGBAFrame {
  std::vector<uint8_t> data;
  int width{0};
  int height{0};
  int64_t pts_ms{0};

  RGBAFrame() = default;
  RGBAFrame(std::vector<uint8_t> &&d, int w, int h, int64_t pts)
      : data(std::move(d)), width(w), height(h), pts_ms(pts) {}

  size_t size() const { return data.size(); }
  bool valid() const { return !data.empty() && width > 0 && height > 0; }
};

StickerResult ProcessSticker(const uint8_t *input_data, size_t input_size,
                             const StickerOptions &options) noexcept;

bool IsWebPFormat(const uint8_t *data, size_t size) noexcept;

std::vector<uint8_t>
BuildWhatsAppExif(const std::string &packName, const std::string &authorName,
                  const std::vector<std::string> &emojis) noexcept;

std::vector<uint8_t>
AttachExifToWebP(const std::vector<uint8_t> &webp_data,
                 const std::vector<uint8_t> &exif_data) noexcept;

std::optional<std::vector<uint8_t>> EncodeRGBA(const uint8_t *rgba_data,
                                               int width, int height,
                                               int quality) noexcept;

} // namespace StickerCore