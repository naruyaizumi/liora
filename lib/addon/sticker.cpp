#include <napi.h>
#include <vector>
#include <string>
#include <cstring>
#include <stdexcept>
#include <sstream>
#include <random>
#include <algorithm>
#include <limits>
#include <webp/encode.h>
#include <webp/mux.h>
#include <webp/mux_types.h>
#include <webp/decode.h>
#include <webp/demux.h>

extern "C" {
#include <libavformat/avformat.h>
#include <libavutil/imgutils.h>
#include <libavutil/avutil.h>
#include <libavcodec/avcodec.h>
#include <libswscale/swscale.h>
}

static inline void ensure(bool ok, const char* msg) {
  if (!ok) throw std::runtime_error(msg);
}
static inline void ensure_ptr(const void* p, const char* msg) {
  if (!p) throw std::runtime_error(msg);
}

struct AvFmtGuard { AVFormatContext* p=nullptr; ~AvFmtGuard(){ if(p) avformat_close_input(&p);} };
struct AvIOGuard  { AVIOContext*     p=nullptr; ~AvIOGuard(){ if(p){ av_free(p->buffer); avio_context_free(&p);} } };
struct AvCodecCtxG{ AVCodecContext*  p=nullptr; ~AvCodecCtxG(){ if(p) avcodec_free_context(&p);} };
struct AvFrameGuard{ AVFrame*        p=nullptr; ~AvFrameGuard(){ if(p) av_frame_free(&p);} };
struct SwsGuard   { SwsContext*      p=nullptr; ~SwsGuard(){ if(p) sws_freeContext(p);} };

static inline void write_le32(uint8_t* d, uint32_t x){
  d[0]=x&0xff; d[1]=(x>>8)&0xff; d[2]=(x>>16)&0xff; d[3]=(x>>24)&0xff;
}
static std::string random_hex(size_t nbytes) {
  static const char* k="0123456789abcdef";
  std::string out; out.resize(nbytes*2);
  for (size_t i=0;i<nbytes;++i){ unsigned v = (unsigned)rand()&0xff; out[i*2]=k[(v>>4)&0xf]; out[i*2+1]=k[v&0xf]; }
  return out;
}
static std::vector<uint8_t> BuildWhatsAppExif(
  const std::string& packName,
  const std::string& authorName,
  const std::vector<std::string>& emojis
){
  std::ostringstream ss;
  ss << "{"
     << "\"sticker-pack-id\":\"" << random_hex(16) << "\","
     << "\"sticker-pack-name\":\"" << packName << "\","
     << "\"sticker-pack-publisher\":\"" << authorName << "\","
     << "\"emojis\":[";
  for(size_t i=0;i<emojis.size();++i){ if(i) ss<<","; ss<<"\""<<emojis[i]<<"\""; }
  ss << "]}";
  const std::string json = ss.str();

  static const uint8_t tiff_hdr[] = {
    0x49,0x49,0x2A,0x00,0x08,0x00,0x00,0x00,0x01,0x00,0x41,0x57,0x07,0x00,
    0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00
  };
  std::vector<uint8_t> exif;
  exif.reserve(sizeof(tiff_hdr)+json.size());
  exif.insert(exif.end(), tiff_hdr, tiff_hdr+sizeof(tiff_hdr));
  write_le32(&exif[14], (uint32_t)json.size());
  exif.insert(exif.end(), json.begin(), json.end());
  return exif;
}

static std::vector<uint8_t> AttachExifToWebP(const std::vector<uint8_t>& webp,
                                             const std::vector<uint8_t>& exif){
  WebPData in; in.bytes = webp.data(); in.size = webp.size();
  WebPMux* mux = WebPMuxCreate(&in, 1); ensure_ptr(mux, "WebPMuxCreate failed");
  WebPData ex; ex.bytes = exif.data(); ex.size = exif.size();
  ensure(WebPMuxSetChunk(mux, "EXIF", &ex, 1) == WEBP_MUX_OK, "WebPMuxSetChunk(EXIF) failed");
  WebPData out; WebPDataInit(&out);
  ensure(WebPMuxAssemble(mux, &out) == WEBP_MUX_OK, "WebPMuxAssemble failed");
  WebPMuxDelete(mux);
  std::vector<uint8_t> res(out.size);
  std::memcpy(res.data(), out.bytes, out.size);
  WebPDataClear(&out);
  return res;
}

static bool IsWebP(const uint8_t* d, size_t n){
  if(n<12) return false;
  return std::memcmp(d, "RIFF", 4)==0 && std::memcmp(d+8, "WEBP", 4)==0;
}

struct BufferCtx { const uint8_t* data; size_t size; size_t pos; };
static int readPacket(void* opaque, uint8_t* buf, int buf_size){
  BufferCtx* c = (BufferCtx*)opaque;
  size_t rem = c->size - c->pos;
  int tocpy = (int)std::min(rem, (size_t)buf_size);
  if (tocpy<=0) return AVERROR_EOF;
  std::memcpy(buf, c->data + c->pos, tocpy);
  c->pos += tocpy;
  return tocpy;
}
struct OpenResult {
  AvFmtGuard fmt;
  AvIOGuard  io;
  BufferCtx* ctx = nullptr;
  int stream_index = -1;
  AVStream* st = nullptr;
};
static void FreeBufferCtx(OpenResult& R){ if(R.ctx){ delete R.ctx; R.ctx=nullptr; } }

static OpenResult OpenFromBuffer(const uint8_t* buf, size_t len){
  OpenResult R;
  unsigned char* iobuf = (unsigned char*)av_malloc(1<<15);
  ensure_ptr(iobuf, "av_malloc failed");
  R.ctx = new BufferCtx{buf,len,0};
  R.io.p = avio_alloc_context(iobuf, 1<<15, 0, R.ctx, &readPacket, nullptr, nullptr);
  ensure_ptr(R.io.p, "avio_alloc_context failed");
  R.fmt.p = avformat_alloc_context();
  ensure_ptr(R.fmt.p, "avformat_alloc_context failed");
  R.fmt.p->pb = R.io.p;
  R.fmt.p->flags |= AVFMT_FLAG_CUSTOM_IO;

  ensure(avformat_open_input(&R.fmt.p, "", nullptr, nullptr)==0, "avformat_open_input failed");
  ensure(avformat_find_stream_info(R.fmt.p, nullptr)>=0, "avformat_find_stream_info failed");
  R.stream_index = av_find_best_stream(R.fmt.p, AVMEDIA_TYPE_VIDEO, -1, -1, nullptr, 0);
  ensure(R.stream_index>=0, "no video/image stream found");
  R.st = R.fmt.p->streams[R.stream_index];
  return R;
}

struct RGBAFrame { std::vector<uint8_t> data; int w,h; int64_t pts_ms; };

static SwsContext* MakeSws(int sw, int sh, AVPixelFormat sfmt, int dw, int dh){
  return sws_getContext(sw, sh, sfmt, dw, dh, AV_PIX_FMT_RGBA, SWS_BILINEAR, nullptr, nullptr, nullptr);
}

static std::vector<uint8_t> RGBAResize512(const uint8_t* rgba, int w, int h, bool crop){
  const int TW=512, TH=512;
  int srcX=0, srcY=0, srcW=w, srcH=h;

  if (crop){
    int side = std::min(w,h);
    srcX = (w - side)/2; srcY = (h - side)/2; srcW = side; srcH = side;
  } else {
    double rw = (double)TW / w, rh = (double)TH / h;
    double s = std::min(rw, rh);
    int dstW = std::max(1, (int)(w*s));
    int dstH = std::max(1, (int)(h*s));

    SwsGuard sw; sw.p = MakeSws(w, h, AV_PIX_FMT_RGBA, dstW, dstH);
    ensure_ptr(sw.p, "sws_getContext pad scale failed");

    std::vector<uint8_t> scaled(dstW*dstH*4);
    uint8_t* dstData[4]; int dstLS[4];
    av_image_fill_arrays(dstData, dstLS, scaled.data(), AV_PIX_FMT_RGBA, dstW, dstH, 1);
    const uint8_t* srcData[4]; int srcLS[4];
    av_image_fill_arrays((uint8_t**)srcData, (int*)srcLS, const_cast<uint8_t*>(rgba), AV_PIX_FMT_RGBA, w, h, 1);
    sws_scale(sw.p, (const uint8_t* const*)srcData, srcLS, 0, h, dstData, dstLS);

    std::vector<uint8_t> canvas(TW*TH*4, 0);
    int offX = (TW - dstW)/2, offY = (TH - dstH)/2;
    for (int y=0;y<dstH;++y){
      std::memcpy(&canvas[((offY+y)*TW + offX)*4], &scaled[y*dstW*4], dstW*4);
    }
    return canvas;
  }

  SwsGuard sw; sw.p = MakeSws(srcW, srcH, AV_PIX_FMT_RGBA, TW, TH);
  ensure_ptr(sw.p, "sws_getContext crop scale failed");

  const uint8_t* srcData[4]; int srcLS[4];
  av_image_fill_arrays((uint8_t**)srcData, (int*)srcLS, const_cast<uint8_t*>(rgba), AV_PIX_FMT_RGBA, w, h, 1);

  const uint8_t* src0 = const_cast<uint8_t*>(rgba) + (srcY*w + srcX)*4;
  const uint8_t* srcDataAdj[4] = { src0, nullptr, nullptr, nullptr };
  int srcLSAdj[4] = { w*4, 0,0,0 };

  std::vector<uint8_t> out(TW*TH*4);
  uint8_t* dstData[4]; int dstLS[4];
  av_image_fill_arrays(dstData, dstLS, out.data(), AV_PIX_FMT_RGBA, TW, TH, 1);
  sws_scale(sw.p, (const uint8_t* const*)srcDataAdj, srcLSAdj, 0, srcH, dstData, dstLS);
  return out;
}

static std::vector<uint8_t> EncodeWebPStaticRGBA512(const uint8_t* rgba512, int quality){
  WebPConfig cfg; ensure(WebPConfigPreset(&cfg, WEBP_PRESET_PICTURE, (float)quality), "WebPConfigPreset failed");
  ensure(WebPValidateConfig(&cfg), "Invalid WebP config");
  WebPPicture pic; ensure(WebPPictureInit(&pic), "WebPPictureInit failed");
  pic.use_argb = 1; pic.width = 512; pic.height = 512;
  ensure(WebPPictureImportRGBA(&pic, rgba512, 512*4), "WebPPictureImportRGBA failed");

  WebPMemoryWriter mw; WebPMemoryWriterInit(&mw);
  pic.writer = WebPMemoryWrite; pic.custom_ptr = &mw;
  ensure(WebPEncode(&cfg, &pic), "WebPEncode failed");
  std::vector<uint8_t> out(mw.size);
  std::memcpy(out.data(), mw.mem, mw.size);
  WebPFree(mw.mem); WebPPictureFree(&pic);
  return out;
}

static std::vector<uint8_t> EncodeWebPAnimRGBA512(const std::vector<RGBAFrame>& frames, int quality, int fps, bool crop){
  ensure(!frames.empty(), "no frames");
  WebPAnimEncoderOptions aopt; WebPAnimEncoderOptionsInit(&aopt);
  WebPAnimEncoder* enc = WebPAnimEncoderNew(512, 512, &aopt);
  ensure_ptr(enc, "WebPAnimEncoderNew failed");

  WebPConfig cfg; ensure(WebPConfigPreset(&cfg, WEBP_PRESET_PICTURE, (float)quality), "WebPConfigPreset failed");
  ensure(WebPValidateConfig(&cfg), "Invalid WebP config");

  int64_t t0 = frames.front().pts_ms;
  for (const auto& fr : frames){
    auto rgba512 = RGBAResize512(fr.data.data(), fr.w, fr.h, crop);

    WebPPicture pic; ensure(WebPPictureInit(&pic), "WebPPictureInit failed");
    pic.use_argb = 1; pic.width = 512; pic.height = 512;
    ensure(WebPPictureImportRGBA(&pic, rgba512.data(), 512*4), "WebPPictureImportRGBA failed");

    int t_ms = (int)std::max<int64_t>(0, fr.pts_ms - t0);
    ensure(WebPAnimEncoderAdd(enc, &pic, t_ms, &cfg) == 1, "WebPAnimEncoderAdd failed");
    WebPPictureFree(&pic);
  }
  int last_ts = (int)std::max<int64_t>(0, frames.back().pts_ms - t0 + (1000 / std::max(1, fps)));
  ensure(WebPAnimEncoderAdd(enc, nullptr, last_ts, nullptr) == 1, "WebPAnimEncoderAdd flush failed");

  WebPData out; WebPDataInit(&out);
  ensure(WebPAnimEncoderAssemble(enc, &out) == 1, "WebPAnimEncoderAssemble failed");
  WebPAnimEncoderDelete(enc);

  std::vector<uint8_t> webp(out.size);
  std::memcpy(webp.data(), out.bytes, out.size);
  WebPDataClear(&out);
  return webp;
}

static AvCodecCtxG OpenDecoder(AVStream* st){
  AvCodecCtxG DC;
  const AVCodec* codec = avcodec_find_decoder(st->codecpar->codec_id);
  ensure_ptr(codec, "decoder not found");
  DC.p = avcodec_alloc_context3(codec); ensure_ptr(DC.p, "avcodec_alloc_context3 failed");
  ensure(avcodec_parameters_to_context(DC.p, st->codecpar)==0, "parameters_to_context failed");
  ensure(avcodec_open2(DC.p, codec, nullptr)==0, "avcodec_open2 failed");
  ensure(DC.p->width>0 && DC.p->height>0, "invalid source dimensions");
  return DC;
}

static std::vector<RGBAFrame> DecodeAll(AVFormatContext* fmt, int si, AVCodecContext* dec,
                                        int maxDurationSec, int targetFps){
  std::vector<RGBAFrame> out;
  AvFrameGuard frame; frame.p = av_frame_alloc(); ensure_ptr(frame.p, "av_frame_alloc failed");
  SwsGuard sws;

  int64_t max_pts = std::numeric_limits<int64_t>::max();
  AVRational tb = fmt->streams[si]->time_base;
  if (tb.den>0){
    max_pts = av_rescale_q((int64_t)maxDurationSec*1000, AVRational{1,1000}, tb);
  }

  int64_t step_pts = 0, next_keep = 0;
  if (targetFps>0 && tb.den>0){
    step_pts = av_rescale_q((int64_t)1000/targetFps, AVRational{1,1000}, tb);
  }

  AVPacket pkt; av_init_packet(&pkt);
  while (av_read_frame(fmt, &pkt) >= 0){
    if (pkt.stream_index != si){ av_packet_unref(&pkt); continue; }
    ensure(avcodec_send_packet(dec, &pkt)==0, "send_packet failed");
    av_packet_unref(&pkt);

    while (true){
      int r = avcodec_receive_frame(dec, frame.p);
      if (r == AVERROR(EAGAIN) || r == AVERROR_EOF) break;
      ensure(r==0, "receive_frame failed");

      if (frame.p->width<=0 || frame.p->height<=0) continue;
      if (!sws.p){
        sws.p = sws_getContext(frame.p->width, frame.p->height, (AVPixelFormat)frame.p->format,
                               frame.p->width, frame.p->height, AV_PIX_FMT_RGBA,
                               SWS_BILINEAR, nullptr, nullptr, nullptr);
        ensure_ptr(sws.p, "sws_getContext decode RGBA failed");
      }

      if (max_pts != std::numeric_limits<int64_t>::max() && frame.p->pts!=AV_NOPTS_VALUE && frame.p->pts > max_pts){
        return out;
      }

      if (step_pts>0 && frame.p->pts!=AV_NOPTS_VALUE){
        if (frame.p->pts < next_keep) continue;
        next_keep = frame.p->pts + step_pts;
      }

      int dstW = frame.p->width, dstH = frame.p->height;
      int num = av_image_get_buffer_size(AV_PIX_FMT_RGBA, dstW, dstH, 1);
      std::vector<uint8_t> rgba(num);
      uint8_t* dstData[4]; int dstLS[4];
      av_image_fill_arrays(dstData, dstLS, rgba.data(), AV_PIX_FMT_RGBA, dstW, dstH, 1);
      sws_scale(sws.p, frame.p->data, frame.p->linesize, 0, dstH, dstData, dstLS);

      int64_t ms = 0;
      if (frame.p->pts!=AV_NOPTS_VALUE) {
        ms = av_rescale_q(frame.p->pts, tb, AVRational{1,1000});
      }
      out.push_back({ std::move(rgba), dstW, dstH, ms });
    }
  }
  ensure(avcodec_send_packet(dec, nullptr)==0, "send_packet(NULL) failed");
  while (avcodec_receive_frame(dec, frame.p)==0){
    if (!sws.p){
      sws.p = sws_getContext(frame.p->width, frame.p->height, (AVPixelFormat)frame.p->format,
                             frame.p->width, frame.p->height, AV_PIX_FMT_RGBA,
                             SWS_BILINEAR, nullptr, nullptr, nullptr);
      ensure_ptr(sws.p, "sws_getContext flush RGBA failed");
    }
    int dstW = frame.p->width, dstH = frame.p->height;
    int num = av_image_get_buffer_size(AV_PIX_FMT_RGBA, dstW, dstH, 1);
    std::vector<uint8_t> rgba(num);
    uint8_t* dstData[4]; int dstLS[4];
    av_image_fill_arrays(dstData, dstLS, rgba.data(), AV_PIX_FMT_RGBA, dstW, dstH, 1);
    sws_scale(sws.p, frame.p->data, frame.p->linesize, 0, dstH, dstData, dstLS);
    int64_t ms = (frame.p->pts!=AV_NOPTS_VALUE) ? av_rescale_q(frame.p->pts, tb, AVRational{1,1000}) : 0;
    out.push_back({ std::move(rgba), dstW, dstH, ms });
  }
  return out;
}

Napi::Value AddExif(const Napi::CallbackInfo& info){
  Napi::Env env = info.Env();
  if (info.Length()<2 || !info[0].IsBuffer() || !info[1].IsObject()){
    Napi::TypeError::New(env, "addExif(webpBuffer, {packName, authorName, emojis?})").ThrowAsJavaScriptException();
    return env.Null();
  }
  auto webp = info[0].As<Napi::Buffer<uint8_t>>();
  Napi::Object meta = info[1].As<Napi::Object>();
  std::string pack = meta.Has("packName") ? meta.Get("packName").ToString().Utf8Value() : "";
  std::string author = meta.Has("authorName") ? meta.Get("authorName").ToString().Utf8Value() : "";
  std::vector<std::string> emojis;
  if (meta.Has("emojis") && meta.Get("emojis").IsArray()){
    Napi::Array arr = meta.Get("emojis").As<Napi::Array>();
    for (uint32_t i=0;i<arr.Length();++i)
      if (arr.Get(i).IsString()) emojis.emplace_back(arr.Get(i).ToString().Utf8Value());
  }

  std::vector<uint8_t> in(webp.Data(), webp.Data()+webp.Length());
  auto ex = BuildWhatsAppExif(pack, author, emojis);
  auto out = AttachExifToWebP(in, ex);
  return Napi::Buffer<uint8_t>::Copy(env, out.data(), out.size());
}

Napi::Value MakeSticker(const Napi::CallbackInfo& info){
  Napi::Env env = info.Env();
  if (info.Length()<1 || !info[0].IsBuffer()){
    Napi::TypeError::New(env, "sticker(inputBuffer, options?)").ThrowAsJavaScriptException();
    return env.Null();
  }
  auto input = info[0].As<Napi::Buffer<uint8_t>>();
  Napi::Object opt = (info.Length()>=2 && info[1].IsObject()) ? info[1].As<Napi::Object>() : Napi::Object::New(env);

  bool crop = opt.Has("crop") ? (bool)opt.Get("crop").ToBoolean() : false;
  int quality = opt.Has("quality") ? (int)opt.Get("quality").ToNumber().Int32Value() : 80;
  int fps = opt.Has("fps") ? (int)opt.Get("fps").ToNumber().Int32Value() : 15;
  int maxDur = opt.Has("maxDuration") ? (int)opt.Get("maxDuration").ToNumber().Int32Value() : 15;
  std::string pack = opt.Has("packName") ? opt.Get("packName").ToString().Utf8Value() : "";
  std::string author = opt.Has("authorName") ? opt.Get("authorName").ToString().Utf8Value() : "";
  std::vector<std::string> emojis;
  if (opt.Has("emojis") && opt.Get("emojis").IsArray()){
    Napi::Array arr = opt.Get("emojis").As<Napi::Array>();
    for (uint32_t i=0;i<arr.Length();++i)
      if (arr.Get(i).IsString()) emojis.emplace_back(arr.Get(i).ToString().Utf8Value());
  }

  const uint8_t* data = input.Data();
  size_t len = input.Length();

  if (IsWebP(data, len)){
    std::vector<uint8_t> in(data, data+len);
    auto ex = BuildWhatsAppExif(pack, author, emojis);
    auto out = AttachExifToWebP(in, ex);
    return Napi::Buffer<uint8_t>::Copy(env, out.data(), out.size());
  }

  OpenResult R = OpenFromBuffer(data, len);
  
  auto DC = OpenDecoder(R.st);
  auto frames = DecodeAll(R.fmt.p, R.stream_index, DC.p, maxDur, fps);
  FreeBufferCtx(R);
  ensure(!frames.empty(), "No frame decoded (unsupported codec / corrupt input)");

  std::vector<uint8_t> webp;
  if (frames.size()==1){
    auto rgba512 = RGBAResize512(frames[0].data.data(), frames[0].w, frames[0].h, crop);
    webp = EncodeWebPStaticRGBA512(rgba512.data(), quality);
  } else {
    webp = EncodeWebPAnimRGBA512(frames, quality, fps, crop);
  }

  auto exif = BuildWhatsAppExif(pack, author, emojis);
  auto out = AttachExifToWebP(webp, exif);
  return Napi::Buffer<uint8_t>::Copy(env, out.data(), out.size());
}

Napi::Object Init(Napi::Env env, Napi::Object exports){
  exports.Set("addExif",    Napi::Function::New(env, AddExif));
  exports.Set("sticker",    Napi::Function::New(env, MakeSticker)); // JS: sticker()
  exports.Set("makeSticker",Napi::Function::New(env, MakeSticker));
  return exports;
}

NODE_API_MODULE(sticker, Init)