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

global.config = {
  /*============== STAFF ==============*/
  owner: [
    ['31629155460', '𝑵𝒂𝒓𝒖𝒚𝒂 𝑰𝒛𝒖𝒎𝒊', true], // true: developer, false: owner
    ['', '', false],
    ['', '', false]
  ],
  group: 'https://', // WhatsApp group link
  website: 'https://linkbio.co/naruyaizumi', // Personal/official website

  /*============= PAIRING =============*/
  pairingNumber: '',             // Bot phone number
  pairingAuth: true,            // true: pairing code, false: QR code

  /*============== API ==============*/
  APIs: {
    btz: 'https://api.betabotz.eu.org'
  },
  APIKeys: {
    'https://api.betabotz.eu.org': '' // APIKEY
  },

  /*============= VPS PANEL =============*/
  domain: 'https://',        // Pterodactyl panel link (manual setup)
  apikey: 'ptla_',           // Admin API Key
  capikey: 'ptlc_',          // Client API Key
  nestid: '-',               // Nest ID for Pterodactyl
  egg: '-',                  // Egg ID for Pterodactyl
  loc: '1',                  // Location ID
  VPS: {
    host: '',                // VPS IP address
    port: '22',              // Open port (SSH)
    username: 'root',        // VPS access username
    password: '-'            // VPS access password
  },
  token: 'TOKEN',            // DigitalOcean API token

  /*============= SUBDOMAIN =============*/
  Subdo: {
    'naruyaizumi.site': {
      zone: '', // Cloudflare zone ID
      apitoken: '' // Cloudflare API token
    }
  },

  /*============== MESSAGES ==============*/
  watermark: '𝙇͢𝙞𝙤𝙧𝙖',
  author: '𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞',
  stickpack: '𝙇͢𝙞𝙤𝙧𝙖',
  stickauth: '© 𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞'
}