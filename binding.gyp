{
  "variables": {
    "common_cflags_cc": [
      "-std=c++20",
      "-O3",
      "-flto=auto",
      "-fuse-linker-plugin",
      "-funroll-loops",
      "-fomit-frame-pointer",
      "-fdata-sections",
      "-ffunction-sections",
      "-fexceptions",
      "-Wno-deprecated-declarations",
      "-Wno-reorder",
      "-Wno-unused-variable",
      "-Wno-unused-parameter",
      "-Wno-sign-compare",
      "-Wno-stringop-overflow"
    ],
    "common_ldflags": [
      "-Wl,--as-needed",
      "-Wl,--gc-sections"
    ],
    "common_includes": [
      "<!@(node -p \"require('node-addon-api').include\")",
      "/usr/include",
      "/usr/local/include"
    ]
  },

  "targets": [
    {
      "target_name": "sticker",
      "sources": ["lib/addon/sticker.cpp"],
      "include_dirs": ["<@(common_includes)"],
      "dependencies": ["<!(node -p \"require('node-addon-api').gyp\")"],
      "cflags_cc": ["<@(common_cflags_cc)"],
      "ldflags": ["<@(common_ldflags)"],
      "defines": ["NAPI_CPP_EXCEPTIONS"],
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
      "sources": ["lib/addon/converter.cpp"],
      "include_dirs": ["<@(common_includes)"],
      "dependencies": ["<!(node -p \"require('node-addon-api').gyp\")"],
      "cflags_cc": ["<@(common_cflags_cc)"],
      "ldflags": ["<@(common_ldflags)"],
      "defines": ["NAPI_CPP_EXCEPTIONS"],
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