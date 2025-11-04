import { fileTypeFromBuffer } from "file-type";

export function protoType() {
    if (!Buffer.prototype.toArrayBuffer) {
        Buffer.prototype.toArrayBuffer = function() {
            return this.buffer.slice(this.byteOffset, this.byteOffset + this.byteLength);
        };
    }

    if (!ArrayBuffer.prototype.toBuffer) {
        ArrayBuffer.prototype.toBuffer = function() {
            return Buffer.from(this);
        };
    }

    async function getFileTypeUnified() {
        let buf;
        if (Buffer.isBuffer(this)) buf = this;
        else if (this instanceof ArrayBuffer) buf = Buffer.from(this);
        else if (this instanceof Uint8Array) buf = Buffer.from(this.buffer, this.byteOffset, this.byteLength);
        else buf = Buffer.from(this.buffer || this);

        try {
            const result = await fileTypeFromBuffer(buf);
            return result || { ext: "bin", mime: "application/octet-stream" };
        } catch {
            return { ext: "bin", mime: "application/octet-stream" };
        }
    }

    if (!Buffer.prototype.getFileType) Buffer.prototype.getFileType = getFileTypeUnified;
    if (!Uint8Array.prototype.getFileType) Uint8Array.prototype.getFileType = getFileTypeUnified;
    if (!ArrayBuffer.prototype.getFileType) ArrayBuffer.prototype.getFileType = getFileTypeUnified;
}