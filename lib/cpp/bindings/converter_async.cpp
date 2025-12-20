#include <napi.h>

#include "../core/converter_core.h"

static Napi::Value Convert(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsBuffer()) {
        Napi::TypeError::New(env, "convert(buffer, options?)").ThrowAsJavaScriptException();
        return env.Null();
    }

    auto buffer = info[0].As<Napi::Buffer<uint8_t>>();
    Napi::Object opt = (info.Length() >= 2 && info[1].IsObject()) ? info[1].As<Napi::Object>()
                                                                  : Napi::Object::New(env);

    ConverterCore::ConvertOptions options;
    options.format = opt.Has("format") ? opt.Get("format").ToString().Utf8Value() : "opus";
    options.sampleRate = opt.Has("sampleRate") ? opt.Get("sampleRate").ToNumber().Int32Value()
                                               : 48000;
    options.channels = opt.Has("channels") ? opt.Get("channels").ToNumber().Int32Value() : 2;
    options.ptt = opt.Has("ptt") ? opt.Get("ptt").ToBoolean() : false;
    options.vbr = opt.Has("vbr") ? opt.Get("vbr").ToBoolean() : true;

    if (opt.Has("bitrate")) {
        Napi::Value br = opt.Get("bitrate");
        if (br.IsNumber()) {
            options.bitrate = static_cast<int64_t>(br.As<Napi::Number>().DoubleValue());
        } else if (br.IsString()) {
            options.bitrate = ConverterCore::ParseBitrate(br.ToString().Utf8Value(), 64000);
        }
    }

    auto result = ConverterCore::ConvertAudio(buffer.Data(), buffer.Length(), options);

    if (!result.success) {
        Napi::Error::New(env, result.error).ThrowAsJavaScriptException();
        return env.Null();
    }

    return Napi::Buffer<uint8_t>::Copy(env, result.data.data(), result.data.size());
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("convert", Napi::Function::New(env, Convert));
    return exports;
}

NODE_API_MODULE(converter, Init)