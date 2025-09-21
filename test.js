import fs from "fs";
import path, { dirname } from "path";
import assert from "assert";
import syntaxError from "syntax-error";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(__dirname);
const pkg = require(path.join(__dirname, "./package.json"));
let folders = [".", ...(pkg.directories ? Object.values(pkg.directories) : [])];
let files = [];
for (let folder of folders) {
    if (!fs.existsSync(folder)) continue;
    for (let file of fs.readdirSync(folder).filter((v) => v.endsWith(".js")))
        files.push(path.resolve(path.join(folder, file)));
}
for (let file of files) {
    if (file === __filename) continue;
    console.error("Checking", file);
    const src = fs.readFileSync(file, "utf8");
    const err = syntaxError(src, file, {
        sourceType: "module",
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true,
    });
    if (err) throw new Error(`Syntax error in ${file}\n\n${err}`);
    assert.ok(file);
    console.log("Done", file);
}
