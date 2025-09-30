import { writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import { tmpdir } from "os";
import { spawn } from "child_process";
import { randomBytes } from "crypto";

async function convert(
  buffer,
  {
    inputExt = "mp4",
    format = "mp3",
    bitrate = "192k",
    channels = 2,
    sampleRate = 44100,
  } = {}
) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Invalid buffer: Buffer kosong atau bukan Buffer");
  }

  const input = path.join(tmpdir(), randomBytes(6).toString("hex") + "." + inputExt);
  const output = path.join(tmpdir(), randomBytes(6).toString("hex") + "." + format);

  await writeFile(input, buffer);

  try {
    await new Promise((resolve, reject) => {
      const args = [
  "-y",
  "-i", input,
  "-vn",
  "-c:a", "libmp3lame",
  "-b:a", bitrate,
  "-ar", sampleRate.toString(),
  "-ac", channels.toString(),
  "-id3v2_version", "3",
  "-write_xing", "0",
  "-fflags", "+bitexact",
  "-map_metadata", "-1",
  "-map_chapters", "-1",
  output,
];

      let logs = [];
      const ff = spawn("ffmpeg", args);

      ff.stderr.on("data", (d) => logs.push(d.toString()));
      ff.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with ${code}\n${logs.slice(-10).join("")}`));
      });
      ff.on("error", reject);
    });

    return await readFile(output);
  } finally {
    await Promise.allSettled([unlink(input), unlink(output)]);
  }
}

export { convert };