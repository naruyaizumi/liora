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
      "-pthread",
      "-Wall",
      "-Wextra",
      "-Wno-deprecated-declarations",
      "-Wno-unused-parameter",
      "-Wno-sign-compare"
    ],
    "common_ldflags": [
      "-Wl,--as-needed",
      "-Wl,--gc-sections",
      "-flto=auto",
      "-pthread"
    ],
    "common_includes": [
      "<!@(node -p \"require('node-addon-api').include\")",
      "/usr/include",
      "/usr/local/include",
      "src/lib/cpp",
      "src/lib/cpp/core"
    ],
    "common_libs": [
      "-lwebp",
      "-lwebpmux",
      "-lwebpdemux",
      "-lavformat",
      "-lavcodec",
      "-lavutil",
      "-lswresample",
      "-lswscale",
      "-lpthread"
    ]
  },

  "targets": [
    {
      "target_name": "sticker_core",
      "type": "static_library",
      "sources": [
        "src/lib/cpp/core/sticker_core.cpp"
      ],
      "include_dirs": ["<@(common_includes)"],
      "cflags_cc": ["<@(common_cflags_cc)"],
      "direct_dependent_settings": {
        "include_dirs": ["<@(common_includes)"]
      }
    },
    {
      "target_name": "converter_core",
      "type": "static_library",
      "sources": [
        "src/lib/cpp/core/converter_core.cpp"
      ],
      "include_dirs": ["<@(common_includes)"],
      "cflags_cc": ["<@(common_cflags_cc)"],
      "direct_dependent_settings": {
        "include_dirs": ["<@(common_includes)"]
      }
    },
    {
      "target_name": "sticker",
      "sources": [
        "src/lib/cpp/bindings/sticker.cpp"
      ],
      "include_dirs": ["<@(common_includes)"],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")",
        "sticker_core"
      ],
      "cflags_cc": ["<@(common_cflags_cc)"],
      "ldflags": ["<@(common_ldflags)"],
      "defines": ["NAPI_CPP_EXCEPTIONS"],
      "libraries": ["<@(common_libs)"]
    },
    {
      "target_name": "converter",
      "sources": [
        "src/lib/cpp/bindings/converter.cpp"
      ],
      "include_dirs": ["<@(common_includes)"],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")",
        "converter_core"
      ],
      "cflags_cc": ["<@(common_cflags_cc)"],
      "ldflags": ["<@(common_ldflags)"],
      "defines": ["NAPI_CPP_EXCEPTIONS"],
      "libraries": ["<@(common_libs)"]
    },
    {
      "target_name": "sticker_async",
      "sources": [
        "src/lib/cpp/bindings/sticker_async.cpp"
      ],
      "include_dirs": ["<@(common_includes)"],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")",
        "sticker_core"
      ],
      "cflags_cc": ["<@(common_cflags_cc)"],
      "ldflags": ["<@(common_ldflags)"],
      "defines": ["NAPI_CPP_EXCEPTIONS"],
      "libraries": ["<@(common_libs)"]
    },
    {
      "target_name": "converter_async",
      "sources": [
        "src/lib/cpp/bindings/converter_async.cpp"
      ],
      "include_dirs": ["<@(common_includes)"],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")",
        "converter_core"
      ],
      "cflags_cc": ["<@(common_cflags_cc)"],
      "ldflags": ["<@(common_ldflags)"],
      "defines": ["NAPI_CPP_EXCEPTIONS"],
      "libraries": ["<@(common_libs)"]
    }
  ]
}