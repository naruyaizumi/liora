/**
 * @file ESLint configuration for Liora WhatsApp Bot
 * @description JavaScript linting rules for Bun runtime environment
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import js from "@eslint/js";
import globals from "globals";

/**
 * ESLint configuration for Liora project
 * @type {import('eslint').Linter.Config[]}
 */
export default [
    js.configs.recommended,
    {
        files: ["**/*.js"],
        ignores: [
            "node_modules/",
            ".github/",
            ".bun/",
            "dist/",
            "logs/",
            "temp/",
            "tmp/",
            "coverage/",
            "*.test.js",
        ],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.es2021,
                ...globals.browser,
                Bun: "readonly",
                global: "readonly",
                process: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                Buffer: "readonly",
                fetch: "readonly",
                FormData: "readonly",
                Headers: "readonly",
                Request: "readonly",
                Response: "readonly",
                URL: "readonly",
                URLSearchParams: "readonly",
                TextEncoder: "readonly",
                TextDecoder: "readonly",
                AbortController: "readonly",
                AbortSignal: "readonly"
            },
            ecmaVersion: "latest",
            sourceType: "module"
        },
        rules: {
            "no-unused-vars": ["error", { 
                "argsIgnorePattern": "^_",
                "varsIgnorePattern": "^_"
            }],
            "no-console": "off",
            "no-debugger": "error",
            "eqeqeq": ["error", "always"],
            "curly": ["error", "all"],
            "semi": ["error", "always"],
            "quotes": ["error", "double"],
            "indent": ["error", 4],
            "comma-dangle": ["error", "never"],
            "arrow-parens": ["error", "always"],
            "prefer-const": "error",
            "no-var": "error",
            "object-shorthand": "error",
            "prefer-template": "error",
            "require-await": "error",
            "no-await-in-loop": "warn",
            "no-eval": "error",
            "no-implied-eval": "error",
            "max-len": ["warn", { 
                "code": 100, 
                "ignoreComments": true,
                "ignoreUrls": true,
                "ignoreTemplateLiterals": true
            }],
            "complexity": ["warn", 10]
        }
    }
];