import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { spawn } from "child_process";
import { promisify } from "util";
import { randomBytes } from "crypto";

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

async function convert(buffer, { ext = "mp4", ptt = false } = {}) {
    let input = path.join(tmpdir(), randomBytes(6).toString("hex") + "." + ext);
    let output = path.join(tmpdir(), randomBytes(6).toString("hex") + (ptt ? ".opus" : ".mp3"));
    await writeFile(input, buffer);
    await new Promise((resolve, reject) => {
        let ff = spawn("ffmpeg", [
            "-y",
            "-i",
            input,
            "-vn",
            "-ar",
            "44100",
            "-ac",
            "2",
            ...(ptt ? ["-c:a", "libopus", "-b:a", "128k"] : ["-c:a", "libmp3lame", "-b:a", "192k"]),
            output,
        ]);
        ff.stderr.on("data", (d) => console.error("ffmpeg:", d.toString()));
        ff.on("close", (code) =>
            code === 0 ? resolve() : reject(new Error("ffmpeg exited with " + code))
        );
        ff.on("error", reject);
    });
    let audio = await readFile(output);
    await unlink(input);
    await unlink(output);
    return audio;
}

export { convert };
