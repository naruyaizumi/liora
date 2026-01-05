const MAX_BUFFER_SIZE = 100 * 1024 * 1024;
const FFMPEG_TIMEOUT = 120000;

function parseBitrate(bitrate, defaultBps = 64000) {
  if (typeof bitrate === "number") {
    return bitrate > 0 ? bitrate : defaultBps;
  }

  if (typeof bitrate === "string") {
    const str = bitrate.toLowerCase().trim();
    if (str.endsWith("k")) {
      const kbps = parseFloat(str.slice(0, -1));
      return isNaN(kbps) ? defaultBps : Math.floor(kbps * 1000);
    }
    const bps = parseInt(str, 10);
    return isNaN(bps) ? defaultBps : bps;
  }

  return defaultBps;
}

function buildFFmpegArgs(options = {}) {
  const format = (options.format || "opus").toLowerCase();
  const sampleRate = options.sampleRate > 0 ? options.sampleRate : 48000;
  const channels = options.channels === 1 ? 1 : 2;
  const ptt = Boolean(options.ptt);
  const vbr = options.vbr !== false;

  let defaultBitrate = 64000;
  let codec = "libopus";
  let container = "ogg";
  let sampleFmt = "s16";

  switch (format) {
    case "mp3":
      defaultBitrate = 128000;
      codec = "libmp3lame";
      container = "mp3";
      sampleFmt = "s16p";
      break;
    case "aac":
    case "m4a":
      defaultBitrate = 128000;
      codec = "aac";
      container = "ipod";
      sampleFmt = "fltp";
      break;
    case "wav":
      codec = "pcm_s16le";
      container = "wav";
      sampleFmt = "s16";
      break;
    case "opus":
    case "ogg":
    case "ogg_opus":
    case "opus_ogg":
    default:
      defaultBitrate = ptt ? 32000 : 64000;
      codec = "libopus";
      container = "ogg";
      sampleFmt = "s16";
      break;
  }

  const bitrate = parseBitrate(options.bitrate, defaultBitrate);
  const finalSampleRate = codec === "libopus" || ptt ? 48000 : sampleRate;
  const finalChannels = ptt ? 1 : channels;

  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    "pipe:0",
    "-vn",
    "-map",
    "0:a:0",
    "-acodec",
    codec,
    "-ar",
    String(finalSampleRate),
    "-ac",
    String(finalChannels),
  ];

  if (codec !== "pcm_s16le") {
    args.push("-b:a", String(bitrate));
  }

  if (codec === "libopus") {
    args.push(
      "-application",
      ptt ? "voip" : "audio",
      "-vbr",
      vbr ? "on" : "off",
      "-compression_level",
      "10",
      "-frame_duration",
      "20",
      "-packet_loss",
      "1",
    );
  } else if (codec === "libmp3lame") {
    if (vbr) {
      args.push("-q:a", "2");
    } else {
      args.push("-q:a", "0");
    }
    args.push("-reservoir", "0");
  } else if (codec === "aac") {
    args.push(
      "-aac_coder",
      "twoloop",
      "-aac_pns",
      "1",
      "-cutoff",
      String(finalSampleRate / 2),
    );
  }

  args.push(
    "-f",
    container,
    "-avoid_negative_ts",
    "make_zero",
    "-fflags",
    "+bitexact",
    "-map_metadata",
    "-1",
    "pipe:1",
  );

  return args;
}

async function spawnFFmpeg(args, inputUint8, timeout = FFMPEG_TIMEOUT) {
  const proc = Bun.spawn(["ffmpeg", ...args], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  let killed = false;
  const timeoutId = setTimeout(() => {
    if (!killed) {
      killed = true;
      proc.kill();
    }
  }, timeout);

  const writerPromise = (async () => {
    try {
      await proc.stdin.write(inputUint8);
      await proc.stdin.end();
    } catch (err) {
      if (!killed) throw err;
    }
  })();

  const outputPromise = Bun.readableStreamToBytes(proc.stdout);
  const stderrPromise = Bun.readableStreamToText(proc.stderr);

  try {
    const [exitCode, output, stderr] = await Promise.all([
      proc.exited,
      outputPromise,
      stderrPromise,
      writerPromise,
    ]);

    clearTimeout(timeoutId);

    if (exitCode !== 0) {
      const errMsg = stderr.trim().slice(-500);
      throw new Error(`FFmpeg exited with code ${exitCode}: ${errMsg}`);
    }

    if (!output || output.length === 0) {
      throw new Error("FFmpeg produced empty output");
    }

    return new Uint8Array(output);
  } catch (err) {
    clearTimeout(timeoutId);
    if (!killed) {
      killed = true;
      proc.kill();
    }
    throw err;
  }
}

export async function convert(input, options = {}) {
  if (!(input instanceof Uint8Array)) {
    throw new TypeError(`convert() requires a Uint8Array, got ${typeof input}`);
  }

  if (input.length === 0) {
    throw new Error("convert() received empty Uint8Array");
  }

  if (input.length > MAX_BUFFER_SIZE) {
    throw new Error(`Input size exceeds limit: ${MAX_BUFFER_SIZE} bytes`);
  }

  const validFormats = [
    "opus",
    "mp3",
    "aac",
    "m4a",
    "ogg",
    "wav",
    "ogg_opus",
    "opus_ogg",
  ];
  const format = (options.format || "opus").toLowerCase();

  if (!validFormats.includes(format)) {
    throw new Error(
      `Invalid format: ${format}. Valid: ${validFormats.join(", ")}`,
    );
  }

  const args = buildFFmpegArgs(options);
  const result = await spawnFFmpeg(args, input);

  return result;
}

export default convert;