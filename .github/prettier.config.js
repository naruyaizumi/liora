export default {
    printWidth: 100,
    tabWidth: 4,
    useTabs: false,
    semi: true,
    singleQuote: false,
    quoteProps: "as-needed",
    jsxSingleQuote: false,
    trailingComma: "es5",
    bracketSpacing: true,
    bracketSameLine: false,
    arrowParens: "always",
    endOfLine: "lf",
    proseWrap: "preserve",
    htmlWhitespaceSensitivity: "css",
    embeddedLanguageFormatting: "auto",
    ignorePath: "./.github/.prettierignore",
    overrides: [
        {
            files: "*.{js}",
            options: {
                parser: "babel"
            }
        }
    ]
};