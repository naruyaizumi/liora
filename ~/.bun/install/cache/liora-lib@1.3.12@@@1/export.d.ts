interface AddonOptions {
    packName?: string;
    authorName?: string;
    emojis?: string[];
}
interface StickerOptions extends AddonOptions {
    crop?: boolean;
    quality?: number;
    fps?: number;
    maxDuration?: number;
}
interface ConvertOptions {
    format?: string;
    bitrate?: string;
    channels?: number;
    sampleRate?: number;
    ptt?: boolean;
    vbr?: boolean;
}
interface CustomResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    url: string;
    ok: boolean;
    body: Buffer;
    abort: () => void;
    arrayBuffer(): Promise<ArrayBuffer | SharedArrayBuffer>;
    buffer(): Promise<Buffer>;
    text(): Promise<string>;
    json(): Promise<any>;
}
interface AddExifOptions extends AddonOptions {}
declare function addExif(buffer: Buffer, meta?: AddExifOptions): Buffer;
declare function sticker(buffer: Buffer, options?: StickerOptions): Buffer;
declare function convert(
    input:
        | Buffer
        | {
              data: Buffer;
          },
    options?: ConvertOptions
): Buffer | Promise<Buffer>;
declare function fetch(url: string, options?: Record<string, any>): Promise<CustomResponse>;
export { addExif, sticker, convert, fetch };
