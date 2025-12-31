#include "converter_core.h"
#include <cstring>
#include <algorithm>
#include <cctype>

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

namespace ConverterCore {

struct AVFmtCtxGuard {
    AVFormatContext* ctx{nullptr};
    ~AVFmtCtxGuard() { if (ctx) avformat_close_input(&ctx); }
};

struct AVIOCtxGuard {
    AVIOContext* ctx{nullptr};
    ~AVIOCtxGuard() { 
        if (ctx) { 
            av_free(ctx->buffer); 
            avio_context_free(&ctx); 
        } 
    }
};

struct AVCodecCtxGuard {
    AVCodecContext* ctx{nullptr};
    ~AVCodecCtxGuard() { if (ctx) avcodec_free_context(&ctx); }
};

struct AVFrameGuard {
    AVFrame* frame{nullptr};
    ~AVFrameGuard() { if (frame) av_frame_free(&frame); }
};

struct SwrCtxGuard {
    SwrContext* ctx{nullptr};
    ~SwrCtxGuard() { if (ctx) swr_free(&ctx); }
};

struct AVFifoGuard {
    AVAudioFifo* fifo{nullptr};
    ~AVFifoGuard() { if (fifo) av_audio_fifo_free(fifo); }
};

struct AVOutFmtCtxGuard {
    AVFormatContext* ctx{nullptr};
    ~AVOutFmtCtxGuard() {
        if (ctx) {
            if (ctx->pb) {
                uint8_t* temp = nullptr;
                avio_close_dyn_buf(ctx->pb, &temp);
                if (temp) av_free(temp);
                ctx->pb = nullptr;
            }
            avformat_free_context(ctx);
        }
    }
};

struct BufferContext {
    const uint8_t* data{nullptr};
    size_t size{0};
    size_t pos{0};
};

static int read_packet(void* opaque, uint8_t* buf, int buf_size) {
    auto* ctx = static_cast<BufferContext*>(opaque);
    if (!ctx || ctx->pos >= ctx->size) return AVERROR_EOF;
    
    size_t remaining = ctx->size - ctx->pos;
    int to_copy = static_cast<int>(std::min(remaining, static_cast<size_t>(buf_size)));
    if (to_copy <= 0) return AVERROR_EOF;
    
    std::memcpy(buf, ctx->data + ctx->pos, to_copy);
    ctx->pos += to_copy;
    return to_copy;
}

static int64_t seek_packet(void* opaque, int64_t offset, int whence) {
    auto* ctx = static_cast<BufferContext*>(opaque);
    if (!ctx) return -1;
    
    if (whence == AVSEEK_SIZE) return static_cast<int64_t>(ctx->size);
    
    size_t new_pos = 0;
    switch (whence) {
        case SEEK_SET: new_pos = offset; break;
        case SEEK_CUR: new_pos = ctx->pos + offset; break;
        case SEEK_END: new_pos = ctx->size + offset; break;
        default: return -1;
    }
    
    if (new_pos > ctx->size) return -1;
    ctx->pos = new_pos;
    return static_cast<int64_t>(ctx->pos);
}

int64_t ParseBitrate(const std::string& bitrate_str, int64_t default_value) noexcept {
    if (bitrate_str.empty()) return default_value;
    
    try {
        std::string str = bitrate_str;
        bool is_kbps = false;
        
        if (!str.empty() && (str.back() == 'k' || str.back() == 'K')) {
            is_kbps = true;
            str.pop_back();
        }
        
        double value = std::stod(str);
        if (is_kbps) value *= 1000.0;
        
        int64_t result = static_cast<int64_t>(value);
        return (result > 0) ? result : default_value;
    } catch (...) {
        return default_value;
    }
}

static AVSampleFormat pick_sample_fmt(const AVCodec* codec) {
    if (!codec || !codec->sample_fmts) return AV_SAMPLE_FMT_FLTP;
    
    for (const AVSampleFormat* p = codec->sample_fmts; *p != AV_SAMPLE_FMT_NONE; ++p) {
        if (*p == AV_SAMPLE_FMT_S16) return AV_SAMPLE_FMT_S16;
    }
    for (const AVSampleFormat* p = codec->sample_fmts; *p != AV_SAMPLE_FMT_NONE; ++p) {
        if (*p == AV_SAMPLE_FMT_FLTP) return AV_SAMPLE_FMT_FLTP;
    }
    
    return codec->sample_fmts[0];
}

static inline int default_frame_size(AVCodecID id) {
    switch (id) {
        case AV_CODEC_ID_OPUS: return 960;
        case AV_CODEC_ID_MP3: return 1152;
        default: return 1024;
    }
}

#if LIBAVUTIL_VERSION_MAJOR >= 57
static void set_channel_layout(AVChannelLayout* layout, int channels) {
    av_channel_layout_default(layout, (channels <= 1) ? 1 : 2);
}

static int get_channel_count(const AVChannelLayout* layout) {
    return layout->nb_channels;
}
#else
static uint64_t get_channel_layout(int channels) {
    return (channels <= 1) ? AV_CH_LAYOUT_MONO : AV_CH_LAYOUT_STEREO;
}

static int get_channel_count(uint64_t channel_layout) {
    return av_get_channel_layout_nb_channels(channel_layout);
}
#endif

static SwrContext* init_resampler(
    AVCodecContext* dec_ctx,
    AVCodecContext* enc_ctx
) {
    SwrContext* swr_ctx = swr_alloc();
    if (!swr_ctx) return nullptr;
    
#if LIBAVUTIL_VERSION_MAJOR >= 57
    av_opt_set_chlayout(swr_ctx, "in_chlayout", &dec_ctx->ch_layout, 0);
    av_opt_set_chlayout(swr_ctx, "out_chlayout", &enc_ctx->ch_layout, 0);
#else
    av_opt_set_int(swr_ctx, "in_channel_layout", dec_ctx->channel_layout, 0);
    av_opt_set_int(swr_ctx, "out_channel_layout", enc_ctx->channel_layout, 0);
#endif
    
    av_opt_set_int(swr_ctx, "in_sample_rate", dec_ctx->sample_rate, 0);
    av_opt_set_int(swr_ctx, "out_sample_rate", enc_ctx->sample_rate, 0);
    av_opt_set_sample_fmt(swr_ctx, "in_sample_fmt", dec_ctx->sample_fmt, 0);
    av_opt_set_sample_fmt(swr_ctx, "out_sample_fmt", enc_ctx->sample_fmt, 0);
    
    if (swr_init(swr_ctx) < 0) {
        swr_free(&swr_ctx);
        return nullptr;
    }
    
    return swr_ctx;
}

static int encode_write_frame(AVFrame* frame, AVCodecContext* enc_ctx, 
                              AVFormatContext* out_ctx, AVStream* out_stream) {
    AVPacket* pkt = av_packet_alloc();
    if (!pkt) return AVERROR(ENOMEM);
    
    int ret = avcodec_send_frame(enc_ctx, frame);
    if (ret < 0) {
        av_packet_free(&pkt);
        return ret;
    }
    
    while (ret >= 0) {
        ret = avcodec_receive_packet(enc_ctx, pkt);
        if (ret == AVERROR(EAGAIN) || ret == AVERROR_EOF) {
            ret = 0;
            break;
        }
        if (ret < 0) {
            av_packet_free(&pkt);
            return ret;
        }
        
        pkt->stream_index = out_stream->index;
        av_packet_rescale_ts(pkt, enc_ctx->time_base, out_stream->time_base);
        
        ret = av_interleaved_write_frame(out_ctx, pkt);
        av_packet_unref(pkt);
        
        if (ret < 0) {
            av_packet_free(&pkt);
            return ret;
        }
    }
    
    av_packet_free(&pkt);
    return 0;
}

ConvertResult ConvertAudio(
    const uint8_t* input_data,
    size_t input_size,
    const ConvertOptions& options
) noexcept {
    if (!input_data || input_size == 0) {
        return ConvertResult("Invalid input: null or empty buffer");
    }
    
    if (input_size > 100 * 1024 * 1024) {
        return ConvertResult("Input too large (max 100MB)");
    }
    
    ConvertOptions opts = options;
    opts.validate();
    
    if (!opts.isValidFormat()) {
        return ConvertResult("Invalid output format: " + opts.format);
    }
    
    try {
        BufferContext buf_ctx{input_data, input_size, 0};
        
        uint8_t* io_buffer = static_cast<uint8_t*>(av_malloc(65536));
        if (!io_buffer) return ConvertResult("Memory allocation failed");
        
        AVIOCtxGuard io_guard;
        io_guard.ctx = avio_alloc_context(
            io_buffer, 65536, 0, &buf_ctx, 
            &read_packet, nullptr, &seek_packet
        );
        
        if (!io_guard.ctx) {
            av_free(io_buffer);
            return ConvertResult("Failed to create IO context");
        }
        
        AVFmtCtxGuard fmt_guard;
        fmt_guard.ctx = avformat_alloc_context();
        if (!fmt_guard.ctx) {
            return ConvertResult("Failed to allocate format context");
        }
        
        fmt_guard.ctx->pb = io_guard.ctx;
        fmt_guard.ctx->flags |= AVFMT_FLAG_CUSTOM_IO;
        
        if (avformat_open_input(&fmt_guard.ctx, "", nullptr, nullptr) != 0) {
            return ConvertResult("Failed to open input");
        }
        
        if (avformat_find_stream_info(fmt_guard.ctx, nullptr) < 0) {
            return ConvertResult("Failed to find stream info");
        }
        
        int audio_stream = av_find_best_stream(
            fmt_guard.ctx, AVMEDIA_TYPE_AUDIO, -1, -1, nullptr, 0
        );
        
        if (audio_stream < 0) {
            return ConvertResult("No audio stream found");
        }
        
        AVStream* in_stream = fmt_guard.ctx->streams[audio_stream];
        const AVCodec* decoder = avcodec_find_decoder(in_stream->codecpar->codec_id);
        if (!decoder) {
            return ConvertResult("Decoder not found");
        }
        
        AVCodecCtxGuard dec_ctx_guard;
        dec_ctx_guard.ctx = avcodec_alloc_context3(decoder);
        if (!dec_ctx_guard.ctx) {
            return ConvertResult("Failed to allocate decoder context");
        }
        
        if (avcodec_parameters_to_context(dec_ctx_guard.ctx, in_stream->codecpar) != 0) {
            return ConvertResult("Failed to copy codec parameters");
        }
        
        if (avcodec_open2(dec_ctx_guard.ctx, decoder, nullptr) != 0) {
            return ConvertResult("Failed to open decoder");
        }
        
        std::string mux_name;
        AVCodecID out_codec_id;
        
        if (opts.format == "mp3") {
            mux_name = "mp3";
            out_codec_id = AV_CODEC_ID_MP3;
        } else if (opts.format == "opus") {
            mux_name = "ogg";
            out_codec_id = AV_CODEC_ID_OPUS;
        } else if (opts.format == "aac" || opts.format == "m4a") {
            mux_name = "ipod";
            out_codec_id = AV_CODEC_ID_AAC;
        } else if (opts.format == "wav") {
            mux_name = "wav";
            out_codec_id = AV_CODEC_ID_PCM_S16LE;
        } else {
            mux_name = "ogg";
            out_codec_id = AV_CODEC_ID_OPUS;
        }
        
        AVOutFmtCtxGuard out_guard;
        if (avformat_alloc_output_context2(&out_guard.ctx, nullptr, mux_name.c_str(), nullptr) != 0 || !out_guard.ctx) {
            return ConvertResult("Failed to allocate output context");
        }
        
        if (avio_open_dyn_buf(&out_guard.ctx->pb) != 0) {
            return ConvertResult("Failed to open dynamic buffer");
        }
        
        const AVCodec* encoder = avcodec_find_encoder(out_codec_id);
        if (!encoder) {
            return ConvertResult("Encoder not found");
        }
        
        AVStream* out_stream = avformat_new_stream(out_guard.ctx, encoder);
        if (!out_stream) {
            return ConvertResult("Failed to create output stream");
        }
        
        AVCodecCtxGuard enc_ctx_guard;
        enc_ctx_guard.ctx = avcodec_alloc_context3(encoder);
        if (!enc_ctx_guard.ctx) {
            return ConvertResult("Failed to allocate encoder context");
        }
        
        int sample_rate = (opts.sampleRate > 0) ? opts.sampleRate : 
                         (dec_ctx_guard.ctx->sample_rate > 0) ? dec_ctx_guard.ctx->sample_rate : 48000;
        
        if (out_codec_id == AV_CODEC_ID_OPUS || opts.ptt) {
            sample_rate = 48000;
        }
        
        int channels = (opts.channels == 1 || opts.ptt) ? 1 : 2;
        AVSampleFormat sample_fmt = pick_sample_fmt(encoder);
        
        enc_ctx_guard.ctx->codec_id = out_codec_id;
        enc_ctx_guard.ctx->codec_type = AVMEDIA_TYPE_AUDIO;
        enc_ctx_guard.ctx->sample_rate = sample_rate;
        enc_ctx_guard.ctx->sample_fmt = sample_fmt;
        enc_ctx_guard.ctx->bit_rate = opts.bitrate;
        enc_ctx_guard.ctx->time_base = AVRational{1, sample_rate};
        
#if LIBAVUTIL_VERSION_MAJOR >= 57
        AVChannelLayout ch_layout;
        set_channel_layout(&ch_layout, channels);
        av_channel_layout_copy(&enc_ctx_guard.ctx->ch_layout, &ch_layout);
#else
        enc_ctx_guard.ctx->channel_layout = get_channel_layout(channels);
        enc_ctx_guard.ctx->channels = channels;
#endif
        
        if (out_codec_id == AV_CODEC_ID_OPUS) {
            av_opt_set(enc_ctx_guard.ctx->priv_data, "application", 
                      (opts.ptt ? "voip" : "audio"), 0);
            av_opt_set(enc_ctx_guard.ctx->priv_data, "vbr", 
                      (opts.vbr ? "on" : "off"), 0);
        }
        
        if (avcodec_open2(enc_ctx_guard.ctx, encoder, nullptr) != 0) {
            return ConvertResult("Failed to open encoder");
        }
        
        out_stream->time_base = enc_ctx_guard.ctx->time_base;
        if (avcodec_parameters_from_context(out_stream->codecpar, enc_ctx_guard.ctx) != 0) {
            return ConvertResult("Failed to copy encoder parameters");
        }
        
        SwrCtxGuard swr_guard;
        swr_guard.ctx = init_resampler(dec_ctx_guard.ctx, enc_ctx_guard.ctx);
        if (!swr_guard.ctx) {
            return ConvertResult("Failed to initialize resampler");
        }
        
        int out_channels;
#if LIBAVUTIL_VERSION_MAJOR >= 57
        out_channels = enc_ctx_guard.ctx->ch_layout.nb_channels;
#else
        out_channels = enc_ctx_guard.ctx->channels;
#endif
        
        AVFifoGuard fifo_guard;
        fifo_guard.fifo = av_audio_fifo_alloc(
            enc_ctx_guard.ctx->sample_fmt,
            out_channels,
            enc_ctx_guard.ctx->frame_size > 0 ? enc_ctx_guard.ctx->frame_size : 1024
        );
        
        if (!fifo_guard.fifo) {
            return ConvertResult("Failed to allocate FIFO buffer");
        }
        
        if (avformat_write_header(out_guard.ctx, nullptr) != 0) {
            return ConvertResult("Failed to write header");
        }
        
        AVPacket* packet = av_packet_alloc();
        if (!packet) {
            return ConvertResult("Failed to allocate packet");
        }
        
        AVFrameGuard decode_frame_guard;
        decode_frame_guard.frame = av_frame_alloc();
        if (!decode_frame_guard.frame) {
            av_packet_free(&packet);
            return ConvertResult("Failed to allocate decode frame");
        }
        
        AVFrameGuard encode_frame_guard;
        encode_frame_guard.frame = av_frame_alloc();
        if (!encode_frame_guard.frame) {
            av_packet_free(&packet);
            return ConvertResult("Failed to allocate encode frame");
        }
        
        int64_t pts = 0;
        int frame_size = enc_ctx_guard.ctx->frame_size > 0 ? 
                        enc_ctx_guard.ctx->frame_size : 
                        default_frame_size(out_codec_id);
        
        while (av_read_frame(fmt_guard.ctx, packet) >= 0) {
            if (packet->stream_index == audio_stream) {
                int ret = avcodec_send_packet(dec_ctx_guard.ctx, packet);
                av_packet_unref(packet);
                
                if (ret < 0) continue;
                
                while (ret >= 0) {
                    ret = avcodec_receive_frame(dec_ctx_guard.ctx, decode_frame_guard.frame);
                    if (ret == AVERROR(EAGAIN) || ret == AVERROR_EOF) break;
                    if (ret < 0) {
                        av_packet_free(&packet);
                        return ConvertResult("Error decoding audio frame");
                    }
                    
                    uint8_t** converted_data = nullptr;
                    int converted_samples = swr_convert(
                        swr_guard.ctx,
                        nullptr, 0,
                        (const uint8_t**)decode_frame_guard.frame->data,
                        decode_frame_guard.frame->nb_samples
                    );
                    
                    if (converted_samples < 0) {
                        av_packet_free(&packet);
                        return ConvertResult("Error during resampling");
                    }
                    
                    converted_samples = swr_get_out_samples(swr_guard.ctx, 0);
                    if (converted_samples > 0) {
                        av_samples_alloc_array_and_samples(
                            &converted_data,
                            nullptr,
                            out_channels,
                            converted_samples,
                            enc_ctx_guard.ctx->sample_fmt,
                            0
                        );
                        
                        converted_samples = swr_convert(
                            swr_guard.ctx,
                            converted_data,
                            converted_samples,
                            nullptr, 0
                        );
                        
                        if (converted_samples > 0) {
                            av_audio_fifo_write(fifo_guard.fifo, (void**)converted_data, converted_samples);
                        }
                        
                        if (converted_data) {
                            av_freep(&converted_data[0]);
                            av_freep(&converted_data);
                        }
                    }
                    
                    while (av_audio_fifo_size(fifo_guard.fifo) >= frame_size) {
                        encode_frame_guard.frame->nb_samples = frame_size;
                        encode_frame_guard.frame->format = enc_ctx_guard.ctx->sample_fmt;
                        encode_frame_guard.frame->sample_rate = enc_ctx_guard.ctx->sample_rate;
                        
#if LIBAVUTIL_VERSION_MAJOR >= 57
                        av_channel_layout_copy(&encode_frame_guard.frame->ch_layout, 
                                             &enc_ctx_guard.ctx->ch_layout);
#else
                        encode_frame_guard.frame->channel_layout = enc_ctx_guard.ctx->channel_layout;
                        encode_frame_guard.frame->channels = enc_ctx_guard.ctx->channels;
#endif
                        
                        if (av_frame_get_buffer(encode_frame_guard.frame, 0) < 0) {
                            av_packet_free(&packet);
                            return ConvertResult("Error allocating frame buffer");
                        }
                        
                        if (av_audio_fifo_read(fifo_guard.fifo, 
                                              (void**)encode_frame_guard.frame->data, 
                                              frame_size) < frame_size) {
                            av_frame_unref(encode_frame_guard.frame);
                            continue;
                        }
                        
                        encode_frame_guard.frame->pts = pts;
                        pts += frame_size;
                        
                        if (encode_write_frame(encode_frame_guard.frame, enc_ctx_guard.ctx, 
                                             out_guard.ctx, out_stream) < 0) {
                            av_frame_unref(encode_frame_guard.frame);
                            av_packet_free(&packet);
                            return ConvertResult("Error encoding audio frame");
                        }
                        
                        av_frame_unref(encode_frame_guard.frame);
                    }
                }
            } else {
                av_packet_unref(packet);
            }
        }
        
        av_packet_free(&packet);
        
        avcodec_send_packet(dec_ctx_guard.ctx, nullptr);
        while (true) {
            int ret = avcodec_receive_frame(dec_ctx_guard.ctx, decode_frame_guard.frame);
            if (ret == AVERROR_EOF || ret == AVERROR(EAGAIN)) break;
            if (ret >= 0) {
                uint8_t** converted_data = nullptr;
                int converted_samples = swr_convert(
                    swr_guard.ctx,
                    nullptr, 0,
                    (const uint8_t**)decode_frame_guard.frame->data,
                    decode_frame_guard.frame->nb_samples
                );
                
                converted_samples = swr_get_out_samples(swr_guard.ctx, 0);
                if (converted_samples > 0) {
                    av_samples_alloc_array_and_samples(
                        &converted_data,
                        nullptr,
                        out_channels,
                        converted_samples,
                        enc_ctx_guard.ctx->sample_fmt,
                        0
                    );
                    
                    converted_samples = swr_convert(
                        swr_guard.ctx,
                        converted_data,
                        converted_samples,
                        nullptr, 0
                    );
                    
                    if (converted_samples > 0) {
                        av_audio_fifo_write(fifo_guard.fifo, (void**)converted_data, converted_samples);
                    }
                    
                    if (converted_data) {
                        av_freep(&converted_data[0]);
                        av_freep(&converted_data);
                    }
                }
            }
        }
        
        while (true) {
            uint8_t** converted_data = nullptr;
            int converted_samples = swr_get_out_samples(swr_guard.ctx, 0);
            if (converted_samples <= 0) break;
            
            av_samples_alloc_array_and_samples(
                &converted_data,
                nullptr,
                out_channels,
                converted_samples,
                enc_ctx_guard.ctx->sample_fmt,
                0
            );
            
            converted_samples = swr_convert(
                swr_guard.ctx,
                converted_data,
                converted_samples,
                nullptr, 0
            );
            
            if (converted_samples > 0) {
                av_audio_fifo_write(fifo_guard.fifo, (void**)converted_data, converted_samples);
            }
            
            if (converted_data) {
                av_freep(&converted_data[0]);
                av_freep(&converted_data);
            }
            
            if (converted_samples <= 0) break;
        }
        
        while (av_audio_fifo_size(fifo_guard.fifo) > 0) {
            int samples_to_encode = std::min(av_audio_fifo_size(fifo_guard.fifo), frame_size);
            
            encode_frame_guard.frame->nb_samples = samples_to_encode;
            encode_frame_guard.frame->format = enc_ctx_guard.ctx->sample_fmt;
            encode_frame_guard.frame->sample_rate = enc_ctx_guard.ctx->sample_rate;
            
#if LIBAVUTIL_VERSION_MAJOR >= 57
            av_channel_layout_copy(&encode_frame_guard.frame->ch_layout, 
                                 &enc_ctx_guard.ctx->ch_layout);
#else
            encode_frame_guard.frame->channel_layout = enc_ctx_guard.ctx->channel_layout;
            encode_frame_guard.frame->channels = enc_ctx_guard.ctx->channels;
#endif
            
            if (av_frame_get_buffer(encode_frame_guard.frame, 0) >= 0) {
                if (av_audio_fifo_read(fifo_guard.fifo, 
                                      (void**)encode_frame_guard.frame->data, 
                                      samples_to_encode) == samples_to_encode) {
                    encode_frame_guard.frame->pts = pts;
                    pts += samples_to_encode;
                    
                    encode_write_frame(encode_frame_guard.frame, enc_ctx_guard.ctx, 
                                     out_guard.ctx, out_stream);
                }
            }
            
            av_frame_unref(encode_frame_guard.frame);
        }
        
        encode_write_frame(nullptr, enc_ctx_guard.ctx, out_guard.ctx, out_stream);
        
        if (av_write_trailer(out_guard.ctx) != 0) {
            return ConvertResult("Failed to write trailer");
        }
        
        uint8_t* out_buffer = nullptr;
        int out_size = avio_close_dyn_buf(out_guard.ctx->pb, &out_buffer);
        out_guard.ctx->pb = nullptr;
        
        if (out_size < 0 || !out_buffer) {
            return ConvertResult("Failed to get output buffer");
        }
        
        std::vector<uint8_t> result(out_buffer, out_buffer + out_size);
        av_free(out_buffer);
        
        return ConvertResult(std::move(result));
        
    } catch (const std::exception& e) {
        return ConvertResult(std::string("Exception: ") + e.what());
    } catch (...) {
        return ConvertResult("Unknown error during audio conversion");
    }
}

} // namespace ConverterCore