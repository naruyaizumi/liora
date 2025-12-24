import js from "@eslint/js";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        files: ["**/*.js"],
        ignores: [
            "node_modules/",
            "build/",
            ".cache/",
            ".github/",
            "*.log",
            "tmp/",
            "temp/",
            ".DS_Store",
            ".oven/",
            "coverage/",
            "**/cache/**",
            "**/dist/**",
            "**/Release/**",
        ],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
];