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
    /**
     * Owner configuration
     * Format: [local_identifier, display_name, is_moderator]
     * - local_identifier: User's native LID, NOT phone number
     * - display_name: Display name for the owner/moderator
     * - is_moderator: true (moderator) | false (owner only)
     *
     * Notes:
     * 1. Always use native LID from WhatsApp/WhiskeySocket to ensure consistency.
     * 2. Do NOT use phone numbers, as JIDs can vary across environments.
     * 3. is_moderator defines additional access rights compared to a normal owner.
     */
    owner: [
        ["113748182302861", "𝑵𝒂𝒓𝒖𝒚𝒂 𝑰𝒛𝒖𝒎𝒊", true], // true: moderator
        // Add other owners/moderators below, same format
        // ["LOCAL_IDENTIFIER", "Owner Name", false],
    ],

    /** WhatsApp group invite link (optional) */
    group: "", // Leave empty if no group, or use full invite link: "https://chat.whatsapp.com/xxxxx"

    /** Website URL (optional) */
    website: "", // Leave empty if no website, or use full URL: "https://example.com"

    /*============= PAIRING =============*/
    /**
     * Pairing configuration for bot connection
     *
     * pairingNumber:
     *   - Bot's phone number for pairing (without '+' or spaces)
     *   - Set to null or empty string for dynamic assignment
     *   - Example: "1234567890"
     *
     * pairingAuth:
     *   - true  → Use verification code (manual input required)
     *   - false → Use QR code scanning for authentication
     */
    pairingNumber: "", // Bot number (leave empty for QR mode or dynamic assignment)
    pairingAuth: false, // false: QR Code | true: Verification Code

    /*============= APPROVE =============*/
    /**
     * Auto-approve configuration based on country codes
     *
     * continent:
     *   - Array of ISO 3166-1 alpha-2 country codes
     *   - Empty array [] allows all countries
     *   - Example: ["US", "CA", "GB"] for USA, Canada, and UK
     *
     * Full list of country codes:
     *
     * Africa:
     *   DZ, AO, BJ, BW, BF, BI, CM, CV, CF, TD, KM, CG, CD, CI, DJ, EG, GQ, ER, SZ,
     *   ET, GA, GM, GH, GN, GW, KE, LS, LR, LY, MG, MW, ML, MR, MU, MA, MZ, NA, NE,
     *   NG, RW, ST, SN, SC, SL, SO, ZA, SS, SD, TZ, TG, TN, UG, ZM, ZW
     *
     * Asia:
     *   AF, AM, AZ, BH, BD, BT, BN, KH, CN, CY, GE, IN, ID, IR, IQ, IL, JP, JO, KZ,
     *   KW, KG, LA, LB, MY, MV, MN, MM, NP, KP, OM, PK, PS, PH, QA, SA, SG, KR, LK,
     *   SY, TJ, TH, TL, TM, AE, UZ, VN, YE
     *
     * Europe:
     *   AL, AD, AT, BY, BE, BA, BG, HR, CZ, DK, EE, FI, FR, DE, GR, HU, IS, IE, IT,
     *   LV, LI, LT, LU, MT, MD, MC, ME, NL, MK, NO, PL, PT, RO, RU, SM, RS, SK, SI,
     *   ES, SE, CH, TR, UA, GB, VA
     *
     * North America:
     *   AG, BS, BB, BZ, CA, CR, CU, DM, DO, SV, GD, GT, HT, HN, JM, MX, NI, PA, KN,
     *   LC, VC, TT, US
     *
     * South America:
     *   AR, BO, BR, CL, CO, EC, GY, PY, PE, SR, UY, VE
     *
     * Oceania:
     *   AU, FJ, KI, MH, FM, NR, NZ, PW, PG, SB, WS, TO, TV, VU
     *
     * Antarctica:
     *   AQ
     */
    continent: [], // Empty array allows all countries

    /*============== MESSAGES ==============*/
    /** Bot watermark/branding */
    watermark: "𝙇͢𝙞𝙤𝙧𝙖",

    /** Author name */
    author: "𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞",

    /** Sticker pack name */
    stickpack: "𝙇͢𝙞𝙤𝙧𝙖",

    /** Sticker pack author/copyright */
    stickauth: "© 𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞",
};

/**
 * Configuration validation
 * Validates the configuration object to prevent runtime errors
 */
