/*
 * Liora WhatsApp Bot
 * @description Open source WhatsApp bot based on Node.js and Baileys.
 *
 * @owner       Naruya Izumi <https://linkbio.co/naruyaizumi>
 * @developer   SXZnightmar <wa.me/6281398961382>
 * @developer   Alfi Dev <wa.me/6287831816747>
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

global.config = {
    /*============== STAFF ==============*/
    owner: [
        ["31629155460", "𝑵𝒂𝒓𝒖𝒚𝒂 𝑰𝒛𝒖𝒎𝒊", true], // true: isMods
        ["", "", false], // false: isOwner
        ["", "", false],
    ],
    group: "https://", // WhatsApp group
    website: "https://", // optional

    /*============= PAIRING =============*/
    pairingNumber: "-", // bot number
    pairingAuth: true, // true: code | false: Qr

    /*============== API ==============*/
    APIs: {
        btz: "https://api.betabotz.eu.org",
    },
    APIKeys: {
        "https://api.betabotz.eu.org": "API_KEY",
    },
    /*============== MESSAGES ==============*/
    watermark: "𝙇͢𝙞𝙤𝙧𝙖",
    author: "𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞",
    stickpack: "𝙇͢𝙞𝙤𝙧𝙖",
    stickauth: "© 𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞",
};
