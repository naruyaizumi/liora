/*
 * Liora WhatsApp Bot
 * @description Open source WhatsApp bot based on Node.js and Baileys.
 *
 * @founder     གྷ Naruya Izumi <https://linkbio.co/naruyaizumi> | wa.me/6283143663697
 * @owner       གྷ SXZnightmar <wa.me/6281398961382>
 * @business    གྷ Ashaa <wa.me/6285167849436>
 * @api-dev     གྷ Alfi Dev <wa.me/6287831816747>
 * @python-dev  གྷ Zhan Dev <wa.me/6281239621820>
 *
 * @copyright   © 2024 - 2025 Naruya Izumi
 * @license     Apache License 2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * IMPORTANT NOTICE:
 * - Do not sell or redistribute this source code for commercial purposes.
 * - Do not remove or alter original credits under any circumstances.
 */

import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
        if (!line || line.startsWith("#")) continue;
        const [key, ...vals] = line.split("=");
        const value = vals
            .join("=")
            .trim()
            .replace(/^['"]|['"]$/g, "");
        if (key && !(key in process.env)) {
            process.env[key.trim()] = value;
        }
    }
}

global.config = {
    /*============== STAFF ==============*/
    owner: [
        ["6283143663697", "𝑵𝒂𝒓𝒖𝒚𝒂 𝑰𝒛𝒖𝒎𝒊", true],
        ["31629155460", "𝑵𝒂𝒓𝒖𝒚𝒂 𝑰𝒛𝒖𝒎𝒊", true],
        ["6281398961382", "𝑺𝑿𝒁𝒏𝒊𝒈𝒉𝒕𝒎𝒂𝒓", true],
        ["6285167849436", "𝑨𝒔𝒉𝒂𝒂", true],
        ["6287831816747", "𝑨𝒍𝒇𝒊 𝑫𝒆𝒗", true],
        ["6281239621820", "𝒁𝒉𝒂𝒏 𝑫𝒆𝒗", true],
    ],
    newsletter: (process.env.NEWSLETTER || "")
        .split(",")
        .map((jid) => jid.trim())
        .filter((jid) => jid.length),
    group: process.env.GROUP,
    website: process.env.WEBSITE,

    /*========== DEVELOPER MODE ==========*/
    DEVELOPER: process.env.IS_IZUMI === "true",

    /*============= PAIRING =============*/
    pairingNumber: process.env.PAIRING_NUMBER,
    pairingAuth: process.env.PAIRING_AUTH === "true",

    /*============== API ==============*/
    APIs: {
        btz: process.env.API_BTZ,
    },
    APIKeys: {
        [process.env.API_BTZ]: process.env.APIKEY_BTZ,
    },

    /*============== MESSAGES ==============*/
    watermark: "𝙇͢𝙞𝙤𝙧𝙖",
    author: "𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞",
    stickpack: "𝙇͢𝙞𝙤𝙧𝙖",
    stickauth: "© 𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞",
};
