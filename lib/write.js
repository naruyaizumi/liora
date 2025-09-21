import { spawn } from "child_process";
import { format } from "util";

export function writeOnPaper({
    imageUrl,
    text = "",
    fontPath = "src/font.ttf",
    color = "black",
    hari = true,
    tgl = true,
}) {
    return new Promise((resolve, reject) => {
        (async () => {
            try {
                let bufs = [];
                let useStdin = /^https?:\/\//i.test(imageUrl);
                let inputPath = useStdin ? "-" : imageUrl;
                let imageBuffer = null;
                if (useStdin) {
                    let res = await fetch(imageUrl);
                    if (!res.ok) throw new Error(`Gagal fetch gambar: ${res.statusText}`);
                    imageBuffer = Buffer.from(await res.arrayBuffer());
                }
                let d = new Date();
                let tglStr = d.toLocaleDateString("id-Id");
                let hariStr = d.toLocaleDateString("id-Id", { weekday: "long" });
                let teks = text.replace(/(.{1,43})(\s|$)/g, "$1\n");
                const args = [
                    inputPath,
                    "-font",
                    fontPath,
                    "-fill",
                    color,
                    "-size",
                    "1024x784",
                    "-pointsize",
                    "20",
                    "-interline-spacing",
                    "1",
                ];
                if (hari) args.push("-annotate", "+806+78", hariStr);
                if (tgl) args.push("-annotate", "+806+102", tglStr);
                args.push(
                    "-font",
                    fontPath,
                    "-fill",
                    color,
                    "-size",
                    "1024x784",
                    "-pointsize",
                    "20",
                    "-interline-spacing",
                    "-7.5",
                    "-annotate",
                    "+344+142",
                    teks,
                    "jpg:-"
                );
                const proc = spawn("convert", args);
                proc.on("error", (err) => reject(format(err)));
                proc.on("close", () => resolve(Buffer.concat(bufs)));
                proc.stdout.on("data", (chunk) => bufs.push(chunk));
                if (useStdin) {
                    proc.stdin.write(imageBuffer);
                    proc.stdin.end();
                }
            } catch (err) {
                reject(err);
            }
        })();
    });
}
