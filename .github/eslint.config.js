import js from "@eslint/js";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        files: ["**/*.js"],
        ignores: ["node_modules/", ".github/"],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.es2021,
                Bun: "readonly",
            },
            ecmaVersion: "latest",
            sourceType: "module",
        },
    },
];
