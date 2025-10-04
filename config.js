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

global.config = {
  /*============== STAFF ==============*/
  owner: [
    ["6283143663697", "𝑵𝒂𝒓𝒖𝒚𝒂 𝑰𝒛𝒖𝒎𝒊", true],
    ["31629155460", "𝑵𝒂𝒓𝒖𝒚𝒂 𝑰𝒛𝒖𝒎𝒊", true],
    ["6281398961382", "𝑺𝑿𝒁𝒏𝒊𝒈𝒉𝒕𝒎𝒂𝒓", true],
    ["6287831816747", "𝑨𝒍𝒇𝒊 𝑫𝒆𝒗", true],
    ["6281239621820", "𝒁𝒉𝒂𝒏 𝑫𝒆𝒗", true],
  ],
  group: "https://", // WhatsApp group
  website: "https://", // optional

  /*========== DEVELOPER MODE ==========*/
  DEV: false, // true? are you kidding me?

  /*============= PAIRING =============*/
  pairingNumber: "628xxxxxxx", // bot number
  pairingAuth: true, // true: code | false: Qr

  /*============== API ==============*/
  APIs: {
    btz: "https://api.betabotz.org",
  },
  APIKeys: {
    "https://api.betabotz.org": "API_KEY",
  },

  /*============== MESSAGES ==============*/
  watermark: "𝙇͢𝙞𝙤𝙧𝙖",
  author: "𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞",
  stickpack: "𝙇͢𝙞𝙤𝙧𝙖",
  stickauth: "© 𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞",
};
