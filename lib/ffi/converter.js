import { validateBuffer, execFFmpeg } from "./utils.js";

const CODEC_MAP = {
    opus: "libopus",
    mp3: "libmp3lame",
    aac: "aac",
    m4a: "aac",
    ogg: "libopus",
};

const FORMAT_MAP = {
    opus: "ogg",
    mp3: "mp3",
    aac: "adts",
    m4a: "ipod",
    ogg: "ogg",
};

const VALID_FORMATS = ["opus", "mp3", "aac", "m4a", "ogg"];

export async function convert(input, options = {}) {
    const buf = Buffer.isBuffer(input) ? input : input?.data;
    validateBuffer(buf, "convert");

    const opts = {
        format: String(options.format || "opus").toLowerCase(),
        bitrate: String(options.bitrate || "64k"),
        channels: Math.min(2, Math.max(1, Number(options.channels) || 2)),
        sampleRate: Number(options.sampleRate) || 48000,
        ptt: Boolean(options.ptt),
        vbr: options.vbr !== false,
    };

    if (!VALID_FORMATS.includes(opts.format)) {
        throw new Error(`Invalid format: ${opts.format}. Valid: ${VALID_FORMATS.join(", ")}`);
    }

    const codec = CODEC_MAP[opts.format];
    const format = FORMAT_MAP[opts.format];

    const args = [
        "-i",
        "pipe:0",
        "-vn",
        "-acodec",
        codec,
        "-b:a",
        opts.bitrate,
        "-ar",
        String(opts.sampleRate),
        "-ac",
        String(opts.channels),
    ];

    if (codec === "libopus") {
        args.push("-application", opts.ptt ? "voip" : "audio");
        args.push("-vbr", opts.vbr ? "on" : "off");
    }

    args.push("-f", format, "pipe:1");

    return execFFmpeg(args, buf);
}
