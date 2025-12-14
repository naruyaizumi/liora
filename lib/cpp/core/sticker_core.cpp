#include "sticker_core.h"
#include <algorithm>
#include <cstring>
#include <limits>
#include <random>
#include <sstream>

#include <webp/decode.h>
#include <webp/demux.h>
#include <webp/encode.h>
#include <webp/mux.h>

extern "C" {
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libavutil/imgutils.h>
#include <libswscale/swscale.h>
}

namespace StickerCore {

struct AVFmtCtxGuard {
  AVFormatContext *ctx{nullptr};
  ~AVFmtCtxGuard() {
    if (ctx)
      avformat_close_input(&ctx);
  }
  AVFormatContext *operator->() { return ctx; }
  AVFormatContext **operator&() { return &ctx; }
};

struct AVIOCtxGuard {
  AVIOContext *ctx{nullptr};
  ~AVIOCtxGuard() {
    if (ctx) {
      av_free(ctx->buffer);
      avio_context_free(&ctx);
    }
  }
};

struct AVCodecCtxGuard {
  AVCodecContext *ctx{nullptr};
  ~AVCodecCtxGuard() {
    if (ctx)
      avcodec_free_context(&ctx);
  }
  AVCodecContext *operator->() { return ctx; }
  AVCodecContext **operator&() { return &ctx; }
};

struct AVFrameGuard {
  AVFrame *frame{nullptr};
  ~AVFrameGuard() {
    if (frame)
      av_frame_free(&frame);
  }
  AVFrame *operator->() { return frame; }
  AVFrame **operator&() { return &frame; }
};

struct SwsCtxGuard {
  SwsContext *ctx{nullptr};
  ~SwsCtxGuard() {
    if (ctx)
      sws_freeContext(ctx);
  }
  SwsContext *operator->() { return ctx; }
};

struct BufferContext {
  const uint8_t *data{nullptr};
  size_t size{0};
  size_t pos{0};
};

static int read_packet(void *opaque, uint8_t *buf, int buf_size) {
  auto *ctx = static_cast<BufferContext *>(opaque);
  if (!ctx || ctx->pos >= ctx->size)
    return AVERROR_EOF;

  size_t remaining = ctx->size - ctx->pos;
  int to_copy =
      static_cast<int>(std::min(remaining, static_cast<size_t>(buf_size)));
  if (to_copy <= 0)
    return AVERROR_EOF;

  std::memcpy(buf, ctx->data + ctx->pos, to_copy);
  ctx->pos += to_copy;
  return to_copy;
}

static int64_t seek_packet(void *opaque, int64_t offset, int whence) {
  auto *ctx = static_cast<BufferContext *>(opaque);
  if (!ctx)
    return -1;

  if (whence == AVSEEK_SIZE)
    return static_cast<int64_t>(ctx->size);

  size_t new_pos = 0;
  switch (whence) {
  case SEEK_SET:
    new_pos = offset;
    break;
  case SEEK_CUR:
    new_pos = ctx->pos + offset;
    break;
  case SEEK_END:
    new_pos = ctx->size + offset;
    break;
  default:
    return -1;
  }

  if (new_pos > ctx->size)
    return -1;
  ctx->pos = new_pos;
  return static_cast<int64_t>(ctx->pos);
}

static void write_le32(uint8_t *dest, uint32_t val) noexcept {
  dest[0] = val & 0xFF;
  dest[1] = (val >> 8) & 0xFF;
  dest[2] = (val >> 16) & 0xFF;
  dest[3] = (val >> 24) & 0xFF;
}

static std::string random_hex(size_t bytes) noexcept {
  static const char hex[] = "0123456789abcdef";
  std::string result;
  result.resize(bytes * 2);

  std::random_device rd;
  std::mt19937 gen(rd());
  std::uniform_int_distribution<> dis(0, 255);

  for (size_t i = 0; i < bytes; ++i) {
    unsigned val = dis(gen);
    result[i * 2] = hex[(val >> 4) & 0xF];
    result[i * 2 + 1] = hex[val & 0xF];
  }
  return result;
}

bool IsWebPFormat(const uint8_t *data, size_t size) noexcept {
  if (!data || size < 12)
    return false;
  return std::memcmp(data, "RIFF", 4) == 0 &&
         std::memcmp(data + 8, "WEBP", 4) == 0;
}

std::vector<uint8_t>
BuildWhatsAppExif(const std::string &packName, const std::string &authorName,
                  const std::vector<std::string> &emojis) noexcept {
  try {
    std::ostringstream json;
    json << "{" << "\"sticker-pack-id\":\"" << random_hex(16) << "\","
         << "\"sticker-pack-name\":\"" << packName << "\","
         << "\"sticker-pack-publisher\":\"" << authorName << "\","
         << "\"emojis\":[";

    for (size_t i = 0; i < emojis.size(); ++i) {
      if (i > 0)
        json << ",";
      json << "\"" << emojis[i] << "\"";
    }
    json << "]}";

    std::string json_str = json.str();

    static const uint8_t tiff_header[] = {
        0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41,
        0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00};

    std::vector<uint8_t> exif;
    exif.reserve(sizeof(tiff_header) + json_str.size());
    exif.insert(exif.end(), tiff_header, tiff_header + sizeof(tiff_header));

    write_le32(&exif[14], static_cast<uint32_t>(json_str.size()));
    exif.insert(exif.end(), json_str.begin(), json_str.end());

    return exif;
  } catch (...) {
    return {};
  }
}

std::vector<uint8_t>
AttachExifToWebP(const std::vector<uint8_t> &webp_data,
                 const std::vector<uint8_t> &exif_data) noexcept {
  if (webp_data.empty() || exif_data.empty())
    return {};

  WebPData in_data;
  in_data.bytes = webp_data.data();
  in_data.size = webp_data.size();

  WebPMux *mux = WebPMuxCreate(&in_data, 1);
  if (!mux)
    return {};

  WebPData exif;
  exif.bytes = exif_data.data();
  exif.size = exif_data.size();

  WebPMuxError err = WebPMuxSetChunk(mux, "EXIF", &exif, 1);
  if (err != WEBP_MUX_OK) {
    WebPMuxDelete(mux);
    return {};
  }

  WebPData out_data;
  WebPDataInit(&out_data);

  err = WebPMuxAssemble(mux, &out_data);
  WebPMuxDelete(mux);

  if (err != WEBP_MUX_OK) {
    WebPDataClear(&out_data);
    return {};
  }

  std::vector<uint8_t> result(out_data.bytes, out_data.bytes + out_data.size);
  WebPDataClear(&out_data);

  return result;
}

static std::vector<uint8_t> resize_rgba_512(const uint8_t *rgba, int width,
                                            int height, bool crop) noexcept {
  constexpr int TARGET_SIZE = 512;

  try {
    int src_x = 0, src_y = 0, src_w = width, src_h = height;

    if (crop) {
      int side = std::min(width, height);
      src_x = (width - side) / 2;
      src_y = (height - side) / 2;
      src_w = side;
      src_h = side;
    }

    SwsContext *sws = sws_getContext(src_w, src_h, AV_PIX_FMT_RGBA, TARGET_SIZE,
                                     TARGET_SIZE, AV_PIX_FMT_RGBA, SWS_BILINEAR,
                                     nullptr, nullptr, nullptr);

    if (!sws)
      return {};
    SwsCtxGuard sws_guard{sws};

    std::vector<uint8_t> result(TARGET_SIZE * TARGET_SIZE * 4);

    std::vector<uint8_t> cropped_src;
    const uint8_t *actual_src = rgba;
    int actual_linesize = width * 4;

    if (crop && (src_x != 0 || src_y != 0)) {
      cropped_src.resize(src_w * src_h * 4);
      for (int y = 0; y < src_h; ++y) {
        const uint8_t *src_line = rgba + ((src_y + y) * width + src_x) * 4;
        uint8_t *dst_line = cropped_src.data() + y * src_w * 4;
        std::memcpy(dst_line, src_line, src_w * 4);
      }
      actual_src = cropped_src.data();
      actual_linesize = src_w * 4;
    }

    const uint8_t *src_data[4] = {actual_src, nullptr, nullptr, nullptr};
    int src_linesize[4] = {actual_linesize, 0, 0, 0};

    uint8_t *dst_data[4] = {result.data(), nullptr, nullptr, nullptr};
    int dst_linesize[4] = {TARGET_SIZE * 4, 0, 0, 0};

    sws_scale(sws, src_data, src_linesize, 0, src_h, dst_data, dst_linesize);

    return result;
  } catch (...) {
    return {};
  }
}

static std::vector<uint8_t> encode_webp_static(const uint8_t *rgba_512,
                                               int quality) noexcept {
  try {
    WebPConfig config;
    if (!WebPConfigPreset(&config, WEBP_PRESET_PICTURE,
                          static_cast<float>(quality))) {
      return {};
    }

    if (!WebPValidateConfig(&config))
      return {};

    WebPPicture picture;
    if (!WebPPictureInit(&picture))
      return {};

    picture.use_argb = 1;
    picture.width = 512;
    picture.height = 512;

    if (!WebPPictureImportRGBA(&picture, rgba_512, 512 * 4)) {
      WebPPictureFree(&picture);
      return {};
    }

    WebPMemoryWriter writer;
    WebPMemoryWriterInit(&writer);
    picture.writer = WebPMemoryWrite;
    picture.custom_ptr = &writer;

    bool ok = WebPEncode(&config, &picture);
    WebPPictureFree(&picture);

    if (!ok) {
      WebPMemoryWriterClear(&writer);
      return {};
    }

    std::vector<uint8_t> result(writer.mem, writer.mem + writer.size);
    WebPMemoryWriterClear(&writer);

    return result;
  } catch (...) {
    return {};
  }
}

static std::vector<uint8_t> decode_first_frame_rgba(const uint8_t *input_data,
                                                    size_t input_size,
                                                    int *out_width,
                                                    int *out_height) noexcept {
  BufferContext buffer_ctx;
  buffer_ctx.data = input_data;
  buffer_ctx.size = input_size;
  buffer_ctx.pos = 0;

  constexpr size_t AVIO_BUFFER_SIZE = 4096;
  uint8_t *avio_buffer = static_cast<uint8_t *>(av_malloc(AVIO_BUFFER_SIZE));
  if (!avio_buffer)
    return {};

  AVIOContext *avio_ctx =
      avio_alloc_context(avio_buffer, AVIO_BUFFER_SIZE, 0, &buffer_ctx,
                         read_packet, nullptr, seek_packet);

  if (!avio_ctx) {
    av_free(avio_buffer);
    return {};
  }

  AVIOCtxGuard avio_guard{avio_ctx};

  AVFormatContext *fmt_ctx = avformat_alloc_context();
  if (!fmt_ctx)
    return {};

  fmt_ctx->pb = avio_ctx;
  fmt_ctx->flags |= AVFMT_FLAG_CUSTOM_IO;

  AVFmtCtxGuard fmt_guard{fmt_ctx};

  if (avformat_open_input(&fmt_ctx, nullptr, nullptr, nullptr) < 0) {
    return {};
  }

  if (avformat_find_stream_info(fmt_ctx, nullptr) < 0) {
    return {};
  }

  int video_stream_idx = -1;
  for (unsigned i = 0; i < fmt_ctx->nb_streams; ++i) {
    if (fmt_ctx->streams[i]->codecpar->codec_type == AVMEDIA_TYPE_VIDEO) {
      video_stream_idx = i;
      break;
    }
  }

  if (video_stream_idx < 0)
    return {};

  AVCodecParameters *codec_params =
      fmt_ctx->streams[video_stream_idx]->codecpar;
  const AVCodec *codec = avcodec_find_decoder(codec_params->codec_id);
  if (!codec)
    return {};

  AVCodecContext *codec_ctx = avcodec_alloc_context3(codec);
  if (!codec_ctx)
    return {};

  AVCodecCtxGuard codec_guard{codec_ctx};

  if (avcodec_parameters_to_context(codec_ctx, codec_params) < 0) {
    return {};
  }

  if (avcodec_open2(codec_ctx, codec, nullptr) < 0) {
    return {};
  }

  AVFrame *frame = av_frame_alloc();
  if (!frame)
    return {};

  AVFrameGuard frame_guard{frame};

  AVPacket packet;
  av_init_packet(&packet);

  std::vector<uint8_t> rgba_data;

  while (av_read_frame(fmt_ctx, &packet) >= 0) {
    if (packet.stream_index == video_stream_idx) {
      if (avcodec_send_packet(codec_ctx, &packet) >= 0) {
        if (avcodec_receive_frame(codec_ctx, frame) >= 0) {
          SwsContext *sws_ctx =
              sws_getContext(frame->width, frame->height,
                             static_cast<AVPixelFormat>(frame->format),
                             frame->width, frame->height, AV_PIX_FMT_RGBA,
                             SWS_BILINEAR, nullptr, nullptr, nullptr);

          if (sws_ctx) {
            SwsCtxGuard sws_guard{sws_ctx};

            rgba_data.resize(frame->width * frame->height * 4);

            uint8_t *dst_data[4] = {rgba_data.data(), nullptr, nullptr,
                                    nullptr};
            int dst_linesize[4] = {frame->width * 4, 0, 0, 0};

            sws_scale(sws_ctx, frame->data, frame->linesize, 0, frame->height,
                      dst_data, dst_linesize);

            *out_width = frame->width;
            *out_height = frame->height;
          }

          av_packet_unref(&packet);
          break;
        }
      }
    }
    av_packet_unref(&packet);
  }

  return rgba_data;
}

std::optional<std::vector<uint8_t>> EncodeRGBA(const uint8_t *rgba_data,
                                               int width, int height,
                                               int quality) noexcept {
  if (!rgba_data || width <= 0 || height <= 0) {
    return std::nullopt;
  }

  std::vector<uint8_t> rgba_512;
  const uint8_t *data_to_encode = rgba_data;

  if (width != 512 || height != 512) {
    rgba_512 = resize_rgba_512(rgba_data, width, height, false);
    if (rgba_512.empty())
      return std::nullopt;
    data_to_encode = rgba_512.data();
  }

  auto result = encode_webp_static(data_to_encode, quality);
  if (result.empty())
    return std::nullopt;

  return result;
}

StickerResult ProcessSticker(const uint8_t *input_data, size_t input_size,
                             const StickerOptions &options) noexcept {
  if (!input_data || input_size == 0) {
    return StickerResult("Invalid input: null or empty buffer");
  }

  if (input_size > 100 * 1024 * 1024) {
    return StickerResult("Input too large (max 100MB)");
  }

  StickerOptions opts = options;
  opts.validate();

  try {
    std::vector<uint8_t> webp_data;

    if (IsWebPFormat(input_data, input_size)) {
      WebPData data;
      data.bytes = input_data;
      data.size = input_size;

      WebPDemuxer *demux = WebPDemux(&data);
      if (!demux) {
        return StickerResult("Invalid WebP format");
      }

      int width = WebPDemuxGetI(demux, WEBP_FF_CANVAS_WIDTH);
      int height = WebPDemuxGetI(demux, WEBP_FF_CANVAS_HEIGHT);
      WebPDemuxDelete(demux);

      if (width == 512 && height == 512) {
        webp_data.assign(input_data, input_data + input_size);
      } else {
        int w = 0, h = 0;
        uint8_t *rgba = WebPDecodeRGBA(input_data, input_size, &w, &h);
        if (!rgba) {
          return StickerResult("Failed to decode WebP");
        }

        auto resized = resize_rgba_512(rgba, w, h, false);
        WebPFree(rgba);

        if (resized.empty()) {
          return StickerResult("Failed to resize WebP");
        }

        webp_data = encode_webp_static(resized.data(), opts.quality);
        if (webp_data.empty()) {
          return StickerResult("Failed to re-encode WebP");
        }
      }
    } else {
      int width = 0, height = 0;
      auto rgba =
          decode_first_frame_rgba(input_data, input_size, &width, &height);

      if (rgba.empty()) {
        return StickerResult("Failed to decode input image/video");
      }

      auto resized = resize_rgba_512(rgba.data(), width, height, false);
      if (resized.empty()) {
        return StickerResult("Failed to resize image");
      }

      webp_data = encode_webp_static(resized.data(), opts.quality);
      if (webp_data.empty()) {
        return StickerResult("Failed to encode to WebP");
      }
    }

    auto exif = BuildWhatsAppExif(opts.packName, opts.authorName, opts.emojis);
    if (exif.empty()) {
      return StickerResult("Failed to build EXIF data");
    }

    auto result = AttachExifToWebP(webp_data, exif);
    if (result.empty()) {
      return StickerResult("Failed to attach EXIF to WebP");
    }

    return StickerResult(std::move(result));

  } catch (const std::exception &e) {
    return StickerResult(std::string("Exception: ") + e.what());
  } catch (...) {
    return StickerResult("Unknown error during sticker processing");
  }
}

} // namespace StickerCore