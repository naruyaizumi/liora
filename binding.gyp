{
  "targets": [
    {
      "target_name": "cron",
      "sources": [ "src/cron.cpp" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags_cc": [
        "-std=c++17",
        "-O3",
        "-fexceptions",
        "-Wno-deprecated-declarations",
        "-Wno-reorder",
        "-Wno-unused-variable",
        "-Wno-unused-parameter",
        "-Wno-sign-compare"
      ],
      "defines": [ "NAPI_CPP_EXCEPTIONS" ]
    },
    {
      "target_name": "sticker",
      "sources": [ "src/sticker.cpp" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags_cc": [
        "-std=c++17",
        "-O3",
        "-fexceptions",
        "-Wno-deprecated-declarations",
        "-Wno-reorder",
        "-Wno-unused-variable",
        "-Wno-unused-parameter",
        "-Wno-sign-compare"
      ],
      "defines": [ "NAPI_CPP_EXCEPTIONS" ],
      "libraries": [
        "-lwebp",
        "-lwebpmux",
        "-lwebpdemux",
        "-lavformat",
        "-lavcodec",
        "-lavutil",
        "-lswresample",
        "-lswscale"
      ]
    },
    {
      "target_name": "converter",
      "sources": [ "src/converter.cpp" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags_cc": [
        "-std=c++17",
        "-O3",
        "-fexceptions",
        "-Wno-deprecated-declarations",
        "-Wno-reorder",
        "-Wno-unused-variable",
        "-Wno-unused-parameter",
        "-Wno-sign-compare"
      ],
      "defines": [ "NAPI_CPP_EXCEPTIONS" ],
      "libraries": [
        "-lavformat",
        "-lavcodec",
        "-lavutil",
        "-lswresample",
        "-lswscale"
      ]
    }
  ]
}