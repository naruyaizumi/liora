/**
 * @file Audio conversion utility using FFmpeg
 * @module lib/convert
 * @description High-performance audio converter with FFmpeg backend for WhatsApp-compatible formats.
 * Supports multiple audio codecs with optimized settings for voice and music transmission.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Maximum input buffer size allowed (100 MB)
 * @constant {number}
 * @default 104857600
 */
const MAX_BUFFER_SIZE = 100 * 1024 * 1024;

/**
 * FFmpeg process timeout in milliseconds (2 minutes)
 * @constant {number}
 * @default 120000
 */
const FFMPEG_TIMEOUT = 120000;

/**
 * Parses bitrate string or number into bits per second
 * @private
 * @function parseBitrate
 * @param {string|number} bitrate - Bitrate value (e.g., "128k", "64000", 128000)
 * @param {number} [defaultBps=64000] - Default bitrate if parsing fails
 * @returns {number} Bitrate in bits per second
 *
 * @supportedFormats
 * - Number: Direct bits per second (e.g., 128000)
 * - String with 'k': Kilobits per second (e.g., "128k" → 128000)
 * - String number: Bits per second as string (e.g., "64000")
 *
 * @example
 * parseBitrate("128k")      // 128000
 * parseBitrate(64000)       // 64000
 * parseBitrate("invalid")   // 64000 (default)
 */
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

/**
 * Builds FFmpeg command-line arguments based on conversion options
 * @private
 * @function buildFFmpegArgs
 * @param {Object} [options={}] - Conversion options
 * @param {string} [options.format="opus"] - Output format: opus, mp3, aac, m4a, wav, ogg
 * @param {number} [options.sampleRate=48000] - Audio sample rate in Hz
 * @param {number} [options.channels=2] - Audio channels (1=mono, 2=stereo)
 * @param {boolean} [options.ptt=false] - Push-to-talk mode (voice optimized)
 * @param {boolean} [options.vbr=true] - Variable bitrate encoding
 * @param {string|number} [options.bitrate] - Target bitrate (e.g., "128k", 64000)
 * @returns {Array<string>} FFmpeg command arguments array
 *
 * @codecSettings
 * - **Opus**: VBR, compression level 10, 20ms frame, 1% packet loss tolerance
 * - **MP3**: VBR quality 2, CBR quality 0, no reservoir
 * - **AAC**: Twoloop coder, PNS enabled, cutoff at Nyquist frequency
 * - **WAV**: PCM 16-bit signed little-endian (no compression)
 *
 * @optimizations
 * - Removes video streams (-vn)
 * - Strips metadata (-map_metadata -1)
 * - Bitexact mode for reproducibility
 * - Zero-based timestamps for compatibility
 *
 * @example
 * buildFFmpegArgs({ format: "opus", ptt: true })
 * // Returns: ["-hide_banner", "-loglevel", "error", ...]
 */
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

/**
 * Spawns FFmpeg process with timeout control and error handling
 * @private
 * @async
 * @function spawnFFmpeg
 * @param {Array<string>} args - FFmpeg command arguments
 * @param {Buffer} inputBuffer - Input audio data
 * @param {number} [timeout=120000] - Process timeout in milliseconds
 * @returns {Promise<Buffer>} Converted audio data
 *
 * @throws {Error} If FFmpeg exits with non-zero code
 * @throws {Error} If FFmpeg produces empty output
 * @throws {Error} If process times out
 *
 * @processFlow
 * 1. Spawn FFmpeg with stdin/stdout/stderr pipes
 * 2. Write input data to stdin
 * 3. Set timeout guard for process kill
 * 4. Read output and stderr streams concurrently
 * 5. Wait for process exit
 * 6. Validate output and return converted audio
 *
 * @memoryManagement
 * - Streams data through pipes (no temp files)
 * - Automatic cleanup on timeout or error
 * - Kills zombie processes on failure
 *
 * @example
 * const args = ["-i", "pipe:0", "-f", "opus", "pipe:1"];
 * const input = Buffer.from([...]);
 * const output = await spawnFFmpeg(args, input, 60000);
 */
async function spawnFFmpeg(args, inputBuffer, timeout = FFMPEG_TIMEOUT) {
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
      await proc.stdin.write(inputBuffer);
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

    return Buffer.from(output);
  } catch (err) {
    clearTimeout(timeoutId);
    if (!killed) {
      killed = true;
      proc.kill();
    }
    throw err;
  }
}

/**
 * Converts audio to WhatsApp-compatible format using FFmpeg
 * @async
 * @function convert
 * @param {Buffer} input - Input audio data (any format FFmpeg supports)
 * @param {Object} [options={}] - Conversion options
 * @param {string} [options.format="opus"] - Output format (opus, mp3, aac, m4a, wav, ogg)
 * @param {number} [options.sampleRate=48000] - Sample rate in Hz
 * @param {number} [options.channels=2] - Audio channels (1 or 2)
 * @param {boolean} [options.ptt=false] - Push-to-talk mode (mono, 48kHz, VOIP optimized)
 * @param {boolean} [options.vbr=true] - Enable variable bitrate encoding
 * @param {string|number} [options.bitrate] - Target bitrate (e.g., "128k", 64000)
 * @returns {Promise<Buffer>} Converted audio data ready for WhatsApp transmission
 *
 * @throws {TypeError} If input is not a Buffer
 * @throws {Error} If input is empty or exceeds 100MB
 * @throws {Error} If format is invalid
 * @throws {Error} If FFmpeg conversion fails
 *
 * @supportedFormats
 * - **opus**: Opus in Ogg container (default, recommended for WhatsApp)
 * - **mp3**: MPEG Layer 3 (universal compatibility)
 * - **aac/m4a**: Advanced Audio Coding (high quality)
 * - **wav**: Uncompressed PCM (lossless, large files)
 * - **ogg**: Ogg Vorbis container
 *
 * @whatsappOptimization
 * - Opus 48kHz for best quality/size ratio
 * - PTT mode: 32kbps mono for voice messages
 * - Music mode: 64kbps stereo for audio files
 *
 * @example
 * // Convert to Opus (WhatsApp voice message)
 * const audioBuffer = Buffer.from(await file.arrayBuffer());
 * const opus = await convert(audioBuffer, { ptt: true });
 *
 * // Convert to MP3 with custom bitrate
 * const mp3 = await convert(audioBuffer, {
 *   format: "mp3",
 *   bitrate: "192k",
 *   channels: 2
 * });
 *
 * // Convert to AAC for high quality
 * const aac = await convert(audioBuffer, {
 *   format: "aac",
 *   bitrate: 256000,
 *   vbr: true
 * });
 */
export async function convert(input, options = {}) {
  if (!Buffer.isBuffer(input)) {
    throw new TypeError(`convert() requires a Buffer, got ${typeof input}`);
  }

  if (input.length === 0) {
    throw new Error("convert() received empty Buffer");
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