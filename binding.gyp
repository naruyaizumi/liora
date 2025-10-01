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
        "-fexceptions"
      ],
      "defines": [
        "NAPI_CPP_EXCEPTIONS"
      ]
    }
  ]
}