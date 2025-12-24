#include <napi.h>

#include "../core/sticker_core.h"

static Napi::Value AddExif(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 2 || !info[0].IsBuffer() || !info[1].IsObject()) {
        Napi::TypeError::New(env, "addExif(buffer, {packName, authorName, emojis})")
                .ThrowAsJavaScriptException();
        return env.Null();
    }

    auto buffer = info[0].As<Napi::Buffer<uint8_t>>();
    Napi::Object meta = info[1].As<Napi::Object>();

    std::string pack_name = meta.Has("packName") ? meta.Get("packName").ToString().Utf8Value() : "";
    std::string author_name = meta.Has("authorName") ? meta.Get("authorName").ToString().Utf8Value()
                                                     : "";

    std::vector<std::string> emojis;
    if (meta.Has("emojis") && meta.Get("emojis").IsArray()) {
        Napi::Array arr = meta.Get("emojis").As<Napi::Array>();
        for (uint32_t i = 0; i < arr.Length(); ++i) {
            if (arr.Get(i).IsString()) {
                emojis.push_back(arr.Get(i).ToString().Utf8Value());
            }
        }
    }

    auto exif = StickerCore::BuildWhatsAppExif(pack_name, author_name, emojis);
    if (exif.empty()) {
        Napi::Error::New(env, "Failed to build EXIF").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::vector<uint8_t> webp(buffer.Data(), buffer.Data() + buffer.Length());
    auto result = StickerCore::AttachExifToWebP(webp, exif);

    if (result.empty()) {
        Napi::Error::New(env, "Failed to attach EXIF to WebP").ThrowAsJavaScriptException();
        return env.Null();
    }

    return Napi::Buffer<uint8_t>::Copy(env, result.data(), result.size());
}

static Napi::Value MakeSticker(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsBuffer()) {
        Napi::TypeError::New(env, "sticker(buffer, options?)").ThrowAsJavaScriptException();
        return env.Null();
    }

    auto buffer = info[0].As<Napi::Buffer<uint8_t>>();
    Napi::Object opt = (info.Length() >= 2 && info[1].IsObject()) ? info[1].As<Napi::Object>()
                                                                  : Napi::Object::New(env);

    StickerCore::StickerOptions options;
    options.crop = opt.Has("crop") ? opt.Get("crop").ToBoolean() : false;
    options.quality = opt.Has("quality") ? opt.Get("quality").ToNumber().Int32Value() : 80;
    options.fps = opt.Has("fps") ? opt.Get("fps").ToNumber().Int32Value() : 15;
    options.maxDuration = opt.Has("maxDuration") ? opt.Get("maxDuration").ToNumber().Int32Value()
                                                 : 15;
    options.packName = opt.Has("packName") ? opt.Get("packName").ToString().Utf8Value() : "";
    options.authorName = opt.Has("authorName") ? opt.Get("authorName").ToString().Utf8Value() : "";

    if (opt.Has("emojis") && opt.Get("emojis").IsArray()) {
        Napi::Array arr = opt.Get("emojis").As<Napi::Array>();
        for (uint32_t i = 0; i < arr.Length(); ++i) {
            if (arr.Get(i).IsString()) {
                options.emojis.push_back(arr.Get(i).ToString().Utf8Value());
            }
        }
    }

    auto result = StickerCore::ProcessSticker(buffer.Data(), buffer.Length(), options);

    if (!result.success) {
        Napi::Error::New(env, result.error).ThrowAsJavaScriptException();
        return env.Null();
    }

    return Napi::Buffer<uint8_t>::Copy(env, result.data.data(), result.data.size());
}

static Napi::Value EncodeRGBA(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 3 || !info[0].IsBuffer() || !info[1].IsNumber() || !info[2].IsNumber()) {
        Napi::TypeError::New(env, "encodeRGBA(buffer, width, height, options?)")
                .ThrowAsJavaScriptException();
        return env.Null();
    }

    auto buffer = info[0].As<Napi::Buffer<uint8_t>>();
    int width = info[1].As<Napi::Number>().Int32Value();
    int height = info[2].As<Napi::Number>().Int32Value();

    Napi::Object opt = (info.Length() >= 4 && info[3].IsObject()) ? info[3].As<Napi::Object>()
                                                                  : Napi::Object::New(env);

    int quality = opt.Has("quality") ? opt.Get("quality").ToNumber().Int32Value() : 80;

    size_t expected_size = static_cast<size_t>(width) * height * 4;
    if (buffer.Length() < expected_size) {
        Napi::Error::New(env, "Buffer too small for specified dimensions")
                .ThrowAsJavaScriptException();
        return env.Null();
    }

    auto result = StickerCore::EncodeRGBA(buffer.Data(), width, height, quality);

    if (!result.has_value()) {
        Napi::Error::New(env, "Failed to encode RGBA").ThrowAsJavaScriptException();
        return env.Null();
    }

    return Napi::Buffer<uint8_t>::Copy(env, result->data(), result->size());
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("addExif", Napi::Function::New(env, AddExif));
    exports.Set("sticker", Napi::Function::New(env, MakeSticker));
    exports.Set("encodeRGBA", Napi::Function::New(env, EncodeRGBA));
    return exports;
}

NODE_API_MODULE(sticker, Init)