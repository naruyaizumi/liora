import js from "@eslint/js";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        files: ["**/*.js"],
        ignores: [
            "node_modules/",
            "build/",
            "lib/rs/target/",
            ".cache/",
            "~/.bun/",
            ".github/",
            "*.log",
            "tmp/",
            "temp/",
            ".DS_Store",
            ".oven/",
            "coverage/"
        ],
        languageOptions: {
            globals: {
                ...globals.node,
                Bun: "readonly",
            },
        },
    },
];