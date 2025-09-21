/*
 * Liora WhatsApp Bot
 * @description Open source WhatsApp bot based on Node.js and Baileys.
 * @author      གྷ 𝑵𝒂𝒓𝒖𝒚𝒂 𝑰𝒛𝒖𝒎𝒊 <https://linkbio.co/naruyaizumi>
 * @co-author   གྷ 𝑺𝑿𝒁𝒏𝒊𝒈𝒉𝒕𝒎𝒂𝒓 <wa.me/6281398961382>
 * @co-author   གྷ 𝑹𝒚𝒐 𝑨𝒌𝒊𝒓𝒂 <wa.me/6289665362039>
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
 * See the License for the specific language governing permissions
 * and limitations under the License.
 */

import "dotenv/config";

global.config = {
    # ===== DEVELOPER MODE =====
    DEVELOPER: process.env.IS_IZUMI === "true"

    /*============== STAFF ==============*/
    owner: [
        ["6283143663697", "𝑵𝒂𝒓𝒖𝒚𝒂 𝑰𝒛𝒖𝒎𝒊", true],
        ["31629155460", "𝑵𝒂𝒓𝒖𝒚𝒂 𝑰𝒛𝒖𝒎𝒊", true],
        ["6281398961382", "𝑺𝑿𝒁𝒏𝒊𝒈𝒉𝒕𝒎𝒂𝒓", true],
        ["6289665362039", "𝑹𝒚𝒐 𝑨𝒌𝒊𝒓𝒂", true],
    ],
    newsletter: process.env.NEWSLETTER,
    group: process.env.GROUP,
    website: process.env.WEBSITE,

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

    /*============= VPS PANEL =============*/
    domain: process.env.PANEL_DOMAIN,
    apikey: process.env.PANEL_APIKEY,
    capikey: process.env.PANEL_CAPIKEY,
    nestid: process.env.PANEL_NESTID,
    egg: process.env.PANEL_EGG,
    loc: process.env.PANEL_LOC,
    VPS: {
        host: process.env.VPS_HOST,
        port: process.env.VPS_PORT,
        username: process.env.VPS_USERNAME,
        password: process.env.VPS_PASSWORD,
    },
    token: process.env.DIGITALOCEAN_TOKEN,
    PAT_TOKEN: process.env.PAT_TOKEN,

    /*============= SUBDOMAIN =============*/
    Subdo: {
        "naruyaizumi.site": {
            zone: process.env.CF_ZONE,
            apitoken: process.env.CF_APIKEY,
        },
    },

    /*============== MESSAGES ==============*/
    watermark: "𝙇͢𝙞𝙤𝙧𝙖",
    author: "𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞",
    stickpack: "𝙇͢𝙞𝙤𝙧𝙖",
    stickauth: "© 𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞",
};
