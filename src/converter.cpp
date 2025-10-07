#include <napi.h>
#include <string>
#include <vector>
#include <stdexcept>
#include <cstring>
#include <algorithm>

extern "C" {
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libavutil/avutil.h>
#include <libavutil/opt.h>
#include <libavutil/channel_layout.h>
#include <libavutil/samplefmt.h>
#include <libavutil/audio_fifo.h>
#include <libswresample/swresample.h>
}

static inline void ensure(bool ok, const char* msg){ if(!ok) throw std::runtime_error(msg); }
static inline void* ensure_ptr(void* p, const char* msg){ if(!p) throw std::runtime_error(msg); return p; }
static inline const void* ensure_cptr(const void* p, const char* msg){ if(!p) throw std::runtime_error(msg); return p; }

struct AVFmtGuard { AVFormatContext* p=nullptr; ~AVFmtGuard(){ if(p) avformat_close_input(&p);} };
struct AVIOGuard  { AVIOContext* p=nullptr; ~AVIOGuard(){ if(p){ av_free(p->buffer); avio_context_free(&p);} } };
struct AVCodecCtxG{ AVCodecContext* p=nullptr; ~AVCodecCtxG(){ if(p) avcodec_free_context(&p);} };
struct AVFrameG   { AVFrame* p=nullptr; ~AVFrameG(){ if(p) av_frame_free(&p);} };
struct SwrGuard   { SwrContext* p=nullptr; ~SwrGuard(){ if(p) swr_free(&p);} };
struct FifoGuard  { AVAudioFifo* p=nullptr; ~FifoGuard(){ if(p) av_audio_fifo_free(p);} };

struct AVOutFmtGuard {
  AVFormatContext* oc=nullptr;
  ~AVOutFmtGuard(){
    if (oc) {
      if (oc->pb) {
        uint8_t* tmp=nullptr;
        int sz=avio_close_dyn_buf(oc->pb, &tmp);
        (void)sz;
        oc->pb=nullptr;
        if (tmp) av_free(tmp);
      }
      avformat_free_context(oc);
      oc=nullptr;
    }
  }
};

struct BufferCtx { const uint8_t* data; size_t size; size_t pos; };

static int readPacket(void* opaque, uint8_t* buf, int buf_size){
  BufferCtx* c = (BufferCtx*)opaque;
  size_t rem = (c->pos < c->size) ? (c->size - c->pos) : 0;
  int tocpy = (int)std::min(rem, (size_t)buf_size);
  if (tocpy <= 0) return AVERROR_EOF;
  std::memcpy(buf, c->data + c->pos, tocpy);
  c->pos += tocpy;
  return tocpy;
}
static int64_t seekPacket(void* opaque, int64_t offset, int whence){
  BufferCtx* c = (BufferCtx*)opaque;
  if (whence == AVSEEK_SIZE) return (int64_t)c->size;
  size_t newpos;
  switch (whence) {
    case SEEK_SET: newpos = (size_t)offset; break;
    case SEEK_CUR: newpos = c->pos + (size_t)offset; break;
    case SEEK_END: newpos = c->size + (size_t)offset; break;
    default: return -1;
  }
  if (newpos > c->size) return -1;
  c->pos = newpos;
  return (int64_t)c->pos;
}

struct OpenInputResult {
  AVFmtGuard fmt;
  AVIOGuard io;
  BufferCtx* ctx = nullptr;
};
static void freeBufferCtx(OpenInputResult& R){ if(R.ctx){ delete R.ctx; R.ctx=nullptr; } }

static OpenInputResult OpenFromBuffer(const uint8_t* data, size_t len){
  OpenInputResult R;
  unsigned char* iobuf = (unsigned char*)ensure_ptr(av_malloc(1<<16), "av_malloc failed");
  R.ctx = new BufferCtx{ data, len, 0 };
  R.io.p = (AVIOContext*)ensure_cptr(
    avio_alloc_context(iobuf, 1<<16, 0, R.ctx, &readPacket, nullptr, &seekPacket),
    "avio_alloc_context failed"
  );
  R.fmt.p = (AVFormatContext*)ensure_cptr(avformat_alloc_context(), "avformat_alloc_context failed");
  R.fmt.p->pb = R.io.p;
  R.fmt.p->flags |= AVFMT_FLAG_CUSTOM_IO;

  ensure(avformat_open_input(&R.fmt.p, "", nullptr, nullptr) == 0, "avformat_open_input failed");
  ensure(avformat_find_stream_info(R.fmt.p, nullptr) >= 0, "avformat_find_stream_info failed");
  return R;
}

static int64_t parseBitrate(const Napi::Value& v, int64_t def_bps){
  if (v.IsNumber()) {
    int64_t b = (int64_t)v.As<Napi::Number>().DoubleValue();
    return b > 0 ? b : def_bps;
  }
  if (v.IsString()) {
    std::string s = v.As<Napi::String>().Utf8Value();
    try {
      if (!s.empty() && (s.back()=='k' || s.back()=='K')) {
        double kbps = std::stod(s.substr(0, s.size()-1));
        return (int64_t)(kbps * 1000.0);
      } else {
        return std::stoll(s);
      }
    } catch (...) { return def_bps; }
  }
  return def_bps;
}

static AVSampleFormat pick_sample_fmt(const AVCodec* enc){
  if (!enc->sample_fmts) return AV_SAMPLE_FMT_FLTP;
  for (const AVSampleFormat* p = enc->sample_fmts; *p != AV_SAMPLE_FMT_NONE; ++p)
    if (*p == AV_SAMPLE_FMT_S16)  return AV_SAMPLE_FMT_S16;
  for (const AVSampleFormat* p = enc->sample_fmts; *p != AV_SAMPLE_FMT_NONE; ++p)
    if (*p == AV_SAMPLE_FMT_FLTP) return AV_SAMPLE_FMT_FLTP;
  return enc->sample_fmts[0];
}

#if LIBAVUTIL_VERSION_MAJOR >= 57
static void set_layout_default(AVChannelLayout* ch, int channels) {
  if (!ch) throw std::runtime_error("channel layout pointer is null");
  av_channel_layout_default(ch, (channels <= 1) ? 1 : 2);
}
#else
static uint64_t choose_layout_legacy(int ch) {
  return (ch <= 1) ? AV_CH_LAYOUT_MONO : AV_CH_LAYOUT_STEREO;
}
#endif

static int default_frame_size(AVCodecID id, int /*sr*/){
  if (id == AV_CODEC_ID_OPUS) return 960;
  if (id == AV_CODEC_ID_MP3)  return 1152;
  return 1024;
}

static std::vector<uint8_t> convertCore(
  const uint8_t* input, size_t inLen,
  const std::string& out_format,
  int64_t bitrate_bps,
  int sample_rate,
  int channels,
  bool ptt,
  bool vbr
){
  auto Rin = OpenFromBuffer(input, inLen);
  int aidx = av_find_best_stream(Rin.fmt.p, AVMEDIA_TYPE_AUDIO, -1, -1, nullptr, 0);
  ensure(aidx >= 0, "No audio stream found");

  AVStream* in_st = Rin.fmt.p->streams[aidx];
  const AVCodec* dec = avcodec_find_decoder(in_st->codecpar->codec_id);
  ensure_cptr(dec, "Decoder not found");

  AVCodecCtxG dec_ctx;
  dec_ctx.p = avcodec_alloc_context3(dec);
  ensure_cptr(dec_ctx.p, "alloc dec ctx failed");
  ensure(avcodec_parameters_to_context(dec_ctx.p, in_st->codecpar) == 0, "params->dec_ctx failed");
  ensure(avcodec_open2(dec_ctx.p, dec, nullptr) == 0, "open decoder failed");

  std::string fmt = out_format;
  std::transform(fmt.begin(), fmt.end(), fmt.begin(), ::tolower);

  std::string mux_name;
  AVCodecID out_codec_id;
  if (fmt == "mp3") { mux_name = "mp3"; out_codec_id = AV_CODEC_ID_MP3; }
  else if (fmt == "opus" || fmt == "ogg" || fmt == "ogg_opus" || fmt == "opus_ogg") { mux_name = "ogg"; out_codec_id = AV_CODEC_ID_OPUS; }
  else if (fmt == "wav") { mux_name = "wav"; out_codec_id = AV_CODEC_ID_PCM_S16LE; }
  else if (fmt == "aac" || fmt == "m4a") { mux_name = "ipod"; out_codec_id = AV_CODEC_ID_AAC; }
  else { mux_name = "ogg"; out_codec_id = AV_CODEC_ID_OPUS; }

  AVOutFmtGuard out_guard;
  ensure(avformat_alloc_output_context2(&out_guard.oc, nullptr, mux_name.c_str(), nullptr) == 0 && out_guard.oc, "alloc outctx failed");
  ensure(avio_open_dyn_buf(&out_guard.oc->pb) == 0, "avio_open_dyn_buf failed");

  const AVCodec* enc = avcodec_find_encoder(out_codec_id);
  ensure_cptr(enc, "Encoder not found");

  AVStream* out_st = avformat_new_stream(out_guard.oc, enc);
  ensure_cptr(out_st, "new out stream failed");

  AVCodecCtxG enc_ctx;
  enc_ctx.p = avcodec_alloc_context3(enc);
  ensure_cptr(enc_ctx.p, "alloc enc ctx failed");

  int sr = sample_rate > 0 ? sample_rate : (dec_ctx.p->sample_rate > 0 ? dec_ctx.p->sample_rate : 48000);
  if (out_codec_id == AV_CODEC_ID_OPUS || ptt) sr = 48000;

  int want_ch = (channels == 1 || ptt) ? 1 : 2;
  AVSampleFormat out_sfmt = pick_sample_fmt(enc);

#if LIBAVUTIL_VERSION_MAJOR >= 57
  AVChannelLayout out_ch{};
  set_layout_default(&out_ch, want_ch);

  enc_ctx.p->codec_id    = out_codec_id;
  enc_ctx.p->codec_type  = AVMEDIA_TYPE_AUDIO;
  enc_ctx.p->sample_rate = sr;
  enc_ctx.p->sample_fmt  = out_sfmt;
  ensure(av_channel_layout_copy(&enc_ctx.p->ch_layout, &out_ch) == 0, "copy out ch_layout failed");
  enc_ctx.p->time_base   = AVRational{1, sr};
#else
  uint64_t ch_layout = choose_layout_legacy(want_ch);
  enc_ctx.p->codec_id    = out_codec_id;
  enc_ctx.p->codec_type  = AVMEDIA_TYPE_AUDIO;
  enc_ctx.p->sample_rate = sr;
  enc_ctx.p->sample_fmt  = out_sfmt;
  enc_ctx.p->channel_layout = ch_layout;
  enc_ctx.p->channels    = av_get_channel_layout_nb_channels(ch_layout);
  enc_ctx.p->time_base   = AVRational{1, sr};
#endif

  if (bitrate_bps <= 0) {
    if (out_codec_id == AV_CODEC_ID_MP3) bitrate_bps = 128000;
    else if (out_codec_id == AV_CODEC_ID_OPUS) bitrate_bps = ptt ? 32000 : 64000;
    else if (out_codec_id == AV_CODEC_ID_AAC) bitrate_bps = 128000;
    else bitrate_bps = 128000;
  }
  enc_ctx.p->bit_rate = bitrate_bps;

  if (out_codec_id == AV_CODEC_ID_OPUS) {
    av_opt_set(enc_ctx.p->priv_data, "application", (ptt ? "voip" : "audio"), 0);
    av_opt_set(enc_ctx.p->priv_data, "vbr", (vbr ? "on" : "off"), 0);
  }

  ensure(avcodec_open2(enc_ctx.p, enc, nullptr) == 0, "open encoder failed");

  out_st->time_base = enc_ctx.p->time_base;
  ensure(avcodec_parameters_from_context(out_st->codecpar, enc_ctx.p) == 0, "enc params -> stream failed");
  ensure(avformat_write_header(out_guard.oc, nullptr) == 0, "write header failed");

#if LIBAVUTIL_VERSION_MAJOR >= 57
  AVChannelLayout in_ch{};
  if (in_st->codecpar->ch_layout.nb_channels > 0) {
    ensure(av_channel_layout_copy(&in_ch, &in_st->codecpar->ch_layout) == 0, "copy in ch_layout failed");
  } else {
    set_layout_default(&in_ch, dec_ctx.p->channels > 0 ? dec_ctx.p->channels : 2);
  }

  SwrGuard swr;
  ensure( swr_alloc_set_opts2(
            &swr.p,
            &enc_ctx.p->ch_layout, enc_ctx.p->sample_fmt, enc_ctx.p->sample_rate,
            &in_ch,               dec_ctx.p->sample_fmt, dec_ctx.p->sample_rate,
            0, nullptr) == 0, "swr_alloc_set_opts2 failed");
  ensure(swr_init(swr.p) == 0, "swr_init failed");
#else
  uint64_t in_ch_layout = dec_ctx.p->channel_layout ?
      dec_ctx.p->channel_layout : choose_layout_legacy(dec_ctx.p->channels > 0 ? dec_ctx.p->channels : 2);

  SwrGuard swr;
  swr.p = swr_alloc_set_opts(
    nullptr,
    (int64_t)enc_ctx.p->channel_layout, enc_ctx.p->sample_fmt, enc_ctx.p->sample_rate,
    (int64_t)in_ch_layout,             dec_ctx.p->sample_fmt, dec_ctx.p->sample_rate,
    0, nullptr
  );
  ensure_cptr(swr.p, "swr_alloc_set_opts failed");
  ensure(swr_init(swr.p) == 0, "swr_init failed");
#endif

  FifoGuard fifo;
  fifo.p = av_audio_fifo_alloc(enc_ctx.p->sample_fmt,
#if LIBAVUTIL_VERSION_MAJOR >= 57
                               enc_ctx.p->ch_layout.nb_channels,
#else
                               enc_ctx.p->channels,
#endif
                               1024);
  ensure_cptr(fifo.p, "av_audio_fifo_alloc failed");

  AVPacket* ipkt = av_packet_alloc(); ensure_cptr(ipkt, "ipkt alloc failed");
  AVFrameG  in_fr;  in_fr.p  = av_frame_alloc(); ensure_cptr(in_fr.p, "in frame alloc failed");
  AVFrameG  out_fr; out_fr.p = av_frame_alloc(); ensure_cptr(out_fr.p, "out frame alloc failed");

  const int enc_frame_size =
    (enc_ctx.p->frame_size > 0) ? enc_ctx.p->frame_size : default_frame_size(out_codec_id, enc_ctx.p->sample_rate);

  int64_t samples_written = 0;

  auto encode_and_write = [&](AVFrame* frame)->void {
    ensure(avcodec_send_frame(enc_ctx.p, frame) == 0, "send_frame failed");
    AVPacket* opkt = av_packet_alloc();
    while (true) {
      int er = avcodec_receive_packet(enc_ctx.p, opkt);
      if (er == AVERROR(EAGAIN) || er == AVERROR_EOF) break;
      ensure(er == 0, "receive_packet failed");
      av_packet_rescale_ts(opkt, enc_ctx.p->time_base, out_st->time_base);
      opkt->stream_index = out_st->index;
      ensure(av_interleaved_write_frame(out_guard.oc, opkt) == 0, "write_frame failed");
      av_packet_unref(opkt);
    }
    av_packet_free(&opkt);
  };

  auto drain_fifo_to_encoder = [&](){
    while (av_audio_fifo_size(fifo.p) >= enc_frame_size) {
      out_fr.p->nb_samples     = enc_frame_size;
#if LIBAVUTIL_VERSION_MAJOR >= 57
      ensure(av_channel_layout_copy(&out_fr.p->ch_layout, &enc_ctx.p->ch_layout) == 0, "copy out ch_layout to frame failed");
#else
      out_fr.p->channel_layout = enc_ctx.p->channel_layout;
      out_fr.p->channels       = enc_ctx.p->channels;
#endif
      out_fr.p->format         = enc_ctx.p->sample_fmt;
      out_fr.p->sample_rate    = enc_ctx.p->sample_rate;
      ensure(av_frame_get_buffer(out_fr.p, 0) == 0, "out frame get_buffer failed");

      ensure(
        av_audio_fifo_read(
          fifo.p,
          (void**)out_fr.p->data,
          enc_frame_size
        ) == enc_frame_size, "fifo_read failed");

      out_fr.p->pts = samples_written;
      samples_written += enc_frame_size;

      encode_and_write(out_fr.p);
      av_frame_unref(out_fr.p);
    }
  };

  while (av_read_frame(Rin.fmt.p, ipkt) >= 0) {
    if (ipkt->stream_index != aidx) { av_packet_unref(ipkt); continue; }
    ensure(avcodec_send_packet(dec_ctx.p, ipkt) == 0, "send_packet(dec) failed");
    av_packet_unref(ipkt);

    while (true) {
      int r = avcodec_receive_frame(dec_ctx.p, in_fr.p);
      if (r == AVERROR(EAGAIN) || r == AVERROR_EOF) break;
      ensure(r == 0, "receive_frame(dec) failed");

      const int dst_nb = av_rescale_rnd(
        swr_get_delay(swr.p, dec_ctx.p->sample_rate) + in_fr.p->nb_samples,
        enc_ctx.p->sample_rate, dec_ctx.p->sample_rate, AV_ROUND_UP
      );

      AVFrame* tmp = av_frame_alloc();
      ensure_cptr(tmp, "tmp frame alloc failed");
#if LIBAVUTIL_VERSION_MAJOR >= 57
      ensure(av_channel_layout_copy(&tmp->ch_layout, &enc_ctx.p->ch_layout) == 0, "copy tmp ch_layout failed");
#else
      tmp->channel_layout = enc_ctx.p->channel_layout;
      tmp->channels       = enc_ctx.p->channels;
#endif
      tmp->format         = enc_ctx.p->sample_fmt;
      tmp->sample_rate    = enc_ctx.p->sample_rate;
      tmp->nb_samples     = dst_nb > 0 ? dst_nb : enc_frame_size;
      ensure(av_frame_get_buffer(tmp, 0) == 0, "tmp get_buffer failed");

      int out_samples = swr_convert(
        swr.p,
        tmp->data, tmp->nb_samples,
        (const uint8_t**)in_fr.p->data, in_fr.p->nb_samples
      );
      ensure(out_samples >= 0, "swr_convert failed");
      tmp->nb_samples = out_samples;

      if (out_samples > 0) {
        ensure(av_audio_fifo_realloc(fifo.p, av_audio_fifo_size(fifo.p) + out_samples) >= 0, "fifo realloc failed");
        ensure(av_audio_fifo_write(fifo.p, (void**)tmp->data, out_samples) == out_samples, "fifo write failed");
      }

      av_frame_unref(in_fr.p);
      av_frame_free(&tmp);
      drain_fifo_to_encoder();
    }
  }

  ensure(avcodec_send_packet(dec_ctx.p, nullptr) == 0, "send_packet(dec,NULL) failed");
  while (true) {
    int r = avcodec_receive_frame(dec_ctx.p, in_fr.p);
    if (r == AVERROR_EOF || r == AVERROR(EAGAIN)) break;
    ensure(r == 0, "receive_frame(dec,flush) failed");

    const int dst_nb = av_rescale_rnd(
      swr_get_delay(swr.p, dec_ctx.p->sample_rate) + in_fr.p->nb_samples,
      enc_ctx.p->sample_rate, dec_ctx.p->sample_rate, AV_ROUND_UP
    );

    AVFrame* tmp = av_frame_alloc();
    ensure_cptr(tmp, "tmp frame alloc2 failed");
#if LIBAVUTIL_VERSION_MAJOR >= 57
    ensure(av_channel_layout_copy(&tmp->ch_layout, &enc_ctx.p->ch_layout) == 0, "copy tmp2 ch_layout failed");
#else
    tmp->channel_layout = enc_ctx.p->channel_layout;
    tmp->channels       = enc_ctx.p->channels;
#endif
    tmp->format         = enc_ctx.p->sample_fmt;
    tmp->sample_rate    = enc_ctx.p->sample_rate;
    tmp->nb_samples     = dst_nb > 0 ? dst_nb : enc_frame_size;
    ensure(av_frame_get_buffer(tmp, 0) == 0, "tmp get_buffer2 failed");

    int out_samples = swr_convert(
      swr.p,
      tmp->data, tmp->nb_samples,
      (const uint8_t**)in_fr.p->data, in_fr.p->nb_samples
    );
    ensure(out_samples >= 0, "swr_convert flush failed");
    tmp->nb_samples = out_samples;

    if (out_samples > 0) {
      ensure(av_audio_fifo_realloc(fifo.p, av_audio_fifo_size(fifo.p) + out_samples) >= 0, "fifo realloc2 failed");
      ensure(av_audio_fifo_write(fifo.p, (void**)tmp->data, out_samples) == out_samples, "fifo write2 failed");
    }

    av_frame_unref(in_fr.p);
    av_frame_free(&tmp);
    drain_fifo_to_encoder();
  }

  while (true) {
    int delay = swr_get_delay(swr.p, dec_ctx.p->sample_rate);
    if (delay <= 0) break;

    AVFrame* tmp = av_frame_alloc();
    ensure_cptr(tmp, "tmp frame alloc3 failed");
#if LIBAVUTIL_VERSION_MAJOR >= 57
    ensure(av_channel_layout_copy(&tmp->ch_layout, &enc_ctx.p->ch_layout) == 0, "copy tmp3 ch_layout failed");
#else
    tmp->channel_layout = enc_ctx.p->channel_layout;
    tmp->channels       = enc_ctx.p->channels;
#endif
    tmp->format         = enc_ctx.p->sample_fmt;
    tmp->sample_rate    = enc_ctx.p->sample_rate;
    tmp->nb_samples     = av_rescale_rnd(delay, enc_ctx.p->sample_rate, dec_ctx.p->sample_rate, AV_ROUND_UP);
    if (tmp->nb_samples <= 0) { av_frame_free(&tmp); break; }
    ensure(av_frame_get_buffer(tmp, 0) == 0, "tmp get_buffer3 failed");

    int out_samples = swr_convert(swr.p, tmp->data, tmp->nb_samples, nullptr, 0);
    ensure(out_samples >= 0, "swr_convert drain failed");
    tmp->nb_samples = out_samples;

    if (out_samples > 0) {
      ensure(av_audio_fifo_realloc(fifo.p, av_audio_fifo_size(fifo.p) + out_samples) >= 0, "fifo realloc drain failed");
      ensure(av_audio_fifo_write(fifo.p, (void**)tmp->data, out_samples) == out_samples, "fifo write drain failed");
    }
    av_frame_free(&tmp);
    drain_fifo_to_encoder();
    if (out_samples == 0) break;
  }

  int left = av_audio_fifo_size(fifo.p);
  if (left > 0) {
    out_fr.p->nb_samples = left;
#if LIBAVUTIL_VERSION_MAJOR >= 57
    ensure(av_channel_layout_copy(&out_fr.p->ch_layout, &enc_ctx.p->ch_layout) == 0, "copy tail ch_layout failed");
#else
    out_fr.p->channel_layout = enc_ctx.p->channel_layout;
    out_fr.p->channels       = enc_ctx.p->channels;
#endif
    out_fr.p->format      = enc_ctx.p->sample_fmt;
    out_fr.p->sample_rate = enc_ctx.p->sample_rate;
    ensure(av_frame_get_buffer(out_fr.p, 0) == 0, "out frame get_buffer (tail) failed");
    ensure(av_audio_fifo_read(fifo.p, (void**)out_fr.p->data, left) == left, "fifo read tail failed");
    out_fr.p->pts = samples_written;
    samples_written += left;
    encode_and_write(out_fr.p);
    av_frame_unref(out_fr.p);
  }

  encode_and_write(nullptr);
  ensure(av_write_trailer(out_guard.oc) == 0, "av_write_trailer failed");

  uint8_t* out_buf = nullptr;
  int out_size = avio_close_dyn_buf(out_guard.oc->pb, &out_buf);
  out_guard.oc->pb = nullptr;
  ensure(out_size >= 0 && out_buf, "close_dyn_buf failed");

  std::vector<uint8_t> out((size_t)out_size);
  std::memcpy(out.data(), out_buf, (size_t)out_size);
  av_free(out_buf);

  freeBufferCtx(Rin);
  av_packet_free(&ipkt);

  return out;
}

Napi::Value Convert(const Napi::CallbackInfo& info){
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsBuffer()) {
    Napi::TypeError::New(env, "convert(inputBuffer, options?)").ThrowAsJavaScriptException();
    return env.Null();
  }
  auto input = info[0].As<Napi::Buffer<uint8_t>>();
  Napi::Object opt = (info.Length() >= 2 && info[1].IsObject()) ? info[1].As<Napi::Object>() : Napi::Object::New(env);

  std::string format = opt.Has("format") ? opt.Get("format").ToString().Utf8Value() : "opus";
  int sampleRate     = opt.Has("sampleRate") ? opt.Get("sampleRate").ToNumber().Int32Value() : 48000;
  int channels       = opt.Has("channels")   ? opt.Get("channels").ToNumber().Int32Value()   : 2;
  bool ptt           = opt.Has("ptt")        ? opt.Get("ptt").ToBoolean().Value()            : false;
  bool vbr           = opt.Has("vbr")        ? opt.Get("vbr").ToBoolean().Value()            : true;
  int64_t bitrate    = parseBitrate(opt.Has("bitrate") ? opt.Get("bitrate") : env.Null(),
                                    (format=="mp3"?128000:64000));

  try {
    auto out = convertCore(input.Data(), input.Length(), format, bitrate, sampleRate, channels, ptt, vbr);
    return Napi::Buffer<uint8_t>::Copy(env, out.data(), out.size());
  } catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Object Init(Napi::Env env, Napi::Object exports){
  exports.Set("convert", Napi::Function::New(env, Convert));
  return exports;
}

NODE_API_MODULE(converter, Init)