import pino from "pino";
import store from "./store.js";
import { smsg } from "./smsg.js";
import {
    proto,
    makeWASocket,
    areJidsSameUser,
    WAMessageStubType,
    prepareWAMessageMedia,
    downloadContentFromMessage,
    generateWAMessageFromContent,
    generateWAMessage,
} from "baileys";

const logger = pino({
    level: "debug",
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "HH:MM",
            ignore: "pid,hostname",
        },
    },
});

const _isStr = (v) => typeof v === "string";
const _now = () => Date.now();
const _isStatusJid = (id) => !id || id === "status@broadcast";
const _isGroupJid = (id = "") => id && id.endsWith("@g.us");

const _hidden = (target, key, value) =>
    Object.defineProperty(target, key, {
        value,
        enumerable: false,
        configurable: false,
        writable: true,
    });

class LRUCache {
    constructor(maxSize = 1000, ttl = 3600000) {
        this.maxSize = maxSize;
        this.ttl = ttl;
        this.cache = new Map();
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        this.cache.delete(key);
        this.cache.set(key, item);
        return item.value;
    }

    set(key, value) {
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            value,
            timestamp: Date.now(),
        });
    }

    delete(key) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }

    get size() {
        return this.cache.size;
    }
}

const jidCache = new LRUCache(1000, 3600000);

const _decode = (raw) => {
    if (!raw || typeof raw !== "string") return raw || null;

    const cached = jidCache.get(raw);
    if (cached) return cached;

    const cleaned = raw.replace(/:\d+@/, "@");
    const norm = cleaned.includes("@")
        ? cleaned
        : /^[0-9]+$/.test(cleaned)
          ? cleaned + "@s.whatsapp.net"
          : cleaned;

    jidCache.set(raw, norm);
    return norm;
};

class MessageIndex extends LRUCache {
    constructor() {
        super(5000, 1800000);
    }

    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > this.ttl) {
                this.cache.delete(key);
            }
        }
    }
}

class GroupMetadataCache extends LRUCache {
    constructor() {
        super(500, 600000);
    }
}

export function naruyaizumi(connectionOptions, options = {}) {
    const conn = makeWASocket(connectionOptions);

    _hidden(conn, "_msgIndex", new MessageIndex());
    _hidden(conn, "_groupMetaCache", new GroupMetadataCache());

    const cleanupInterval = setInterval(() => {
        conn._msgIndex.cleanup();
    }, 300000);

    Object.defineProperties(conn, {
        chats: {
            value: { ...(options.chats || {}) },
            writable: true,
        },
        decodeJid: {
            value(jid) {
                if (!jid || typeof jid !== "string") return jid || null;
                return _decode(jid);
            },
        },
        logger: {
            get() {
                const log = (level, args) => {
                    switch (level) {
                        case "info":
                            logger.info(...args);
                            break;
                        case "warn":
                            logger.warn(...args);
                            break;
                        case "error":
                            logger.error(...args);
                            break;
                        case "debug":
                            logger.debug(...args);
                            break;
                        case "trace":
                            logger.trace?.(...args);
                            break;
                        default:
                            logger.info(...args);
                    }
                };

                return {
                    info: (...a) => log("info", a),
                    error: (...a) => log("error", a),
                    warn: (...a) => log("warn", a),
                    trace: (...a) => log("trace", a),
                    debug: (...a) => log("debug", a),
                };
            },
            enumerable: true,
        },
        sendAlbum: {
            async value(jid, items = [], options = {}) {
                if (!this.user?.id) {
                    throw new Error("User not authenticated");
                }

                const messageSecret = new Uint8Array(32);
                crypto.getRandomValues(messageSecret);

                const messageContent = {
                    messageContextInfo: { messageSecret },
                    albumMessage: {
                        expectedImageCount: items.filter((a) => a?.image).length,
                        expectedVideoCount: items.filter((a) => a?.video).length,
                    },
                };

                const generationOptions = {
                    userJid: this.user.id,
                    upload: this.waUploadToServer,
                    quoted: options?.quoted || null,
                    ephemeralExpiration: options?.quoted?.expiration ?? 0,
                };

                const album = generateWAMessageFromContent(jid, messageContent, generationOptions);

                await this.relayMessage(album.key.remoteJid, album.message, {
                    messageId: album.key.id,
                });

                await Promise.all(
                    items.map(async (content) => {
                        const mediaSecret = new Uint8Array(32);
                        crypto.getRandomValues(mediaSecret);

                        const mediaMsg = await generateWAMessage(album.key.remoteJid, content, {
                            upload: this.waUploadToServer,
                            ephemeralExpiration: options?.quoted?.expiration ?? 0,
                        });

                        mediaMsg.message.messageContextInfo = {
                            messageSecret: mediaSecret,
                            messageAssociation: {
                                associationType: 1,
                                parentMessageKey: album.key,
                            },
                        };

                        return this.relayMessage(mediaMsg.key.remoteJid, mediaMsg.message, {
                            messageId: mediaMsg.key.id,
                        });
                    })
                );

                return album;
            },
            enumerable: true,
        },
        sendCard: {
            async value(jid, content = {}, options = {}) {
                if (!this.user?.id) {
                    throw new Error("User not authenticated");
                }

                const { text = "", title = "", footer = "", cards = [] } = content;

                if (!Array.isArray(cards) || cards.length === 0) {
                    throw new Error("Cards must be a non-empty array");
                }

                if (cards.length > 10) {
                    throw new Error("Maximum 10 cards allowed");
                }

                const carouselCards = await Promise.all(
                    cards.map(async (card) => {
                        let mediaType = null;
                        let mediaContent = null;

                        if (card.image) {
                            mediaType = "image";
                            mediaContent = card.image;
                        } else if (card.video) {
                            mediaType = "video";
                            mediaContent = card.video;
                        } else {
                            throw new Error("Card must have 'image' or 'video' property");
                        }

                        const mediaInput = {};
                        if (Buffer.isBuffer(mediaContent)) {
                            mediaInput[mediaType] = mediaContent;
                        } else if (typeof mediaContent === "object" && mediaContent.url) {
                            mediaInput[mediaType] = {
                                url: mediaContent.url,
                            };
                        } else if (typeof mediaContent === "string") {
                            mediaInput[mediaType] = { url: mediaContent };
                        } else {
                            throw new Error("Media must be Buffer, URL string, or { url: string }");
                        }

                        const preparedMedia = await prepareWAMessageMedia(mediaInput, {
                            upload: this.waUploadToServer,
                        });

                        const cardObj = {
                            header: {
                                title: card.title || "",
                                hasMediaAttachment: true,
                            },
                            body: {
                                text: card.body || "",
                            },
                            footer: {
                                text: card.footer || "",
                            },
                        };

                        if (mediaType === "image") {
                            cardObj.header.imageMessage = preparedMedia.imageMessage;
                        } else if (mediaType === "video") {
                            cardObj.header.videoMessage = preparedMedia.videoMessage;
                        }

                        if (Array.isArray(card.buttons) && card.buttons.length > 0) {
                            const processedButtons = [];

                            for (const btn of card.buttons) {
                                if (btn.name && btn.buttonParamsJson) {
                                    processedButtons.push({
                                        name: btn.name,
                                        buttonParamsJson: btn.buttonParamsJson,
                                    });
                                    continue;
                                }

                                if (!btn.type) continue;

                                let buttonData = null;

                                switch (btn.type) {
                                    case "quick_reply":
                                        if (btn.id && btn.display_text) {
                                            buttonData = {
                                                name: "quick_reply",
                                                buttonParamsJson: JSON.stringify({
                                                    display_text: btn.display_text,
                                                    id: btn.id,
                                                }),
                                            };
                                        }
                                        break;

                                    case "cta_url":
                                        if (btn.url && btn.display_text) {
                                            buttonData = {
                                                name: "cta_url",
                                                buttonParamsJson: JSON.stringify({
                                                    display_text: btn.display_text,
                                                    url: btn.url,
                                                    merchant_url: btn.merchant_url || btn.url,
                                                }),
                                            };
                                        }
                                        break;

                                    case "cta_copy":
                                        if (btn.copy_code && btn.display_text) {
                                            buttonData = {
                                                name: "cta_copy",
                                                buttonParamsJson: JSON.stringify({
                                                    display_text: btn.display_text,
                                                    copy_code: btn.copy_code,
                                                }),
                                            };
                                        }
                                        break;

                                    case "cta_call":
                                        if (btn.phone_number && btn.display_text) {
                                            buttonData = {
                                                name: "cta_call",
                                                buttonParamsJson: JSON.stringify({
                                                    display_text: btn.display_text,
                                                    phone_number: btn.phone_number,
                                                }),
                                            };
                                        }
                                        break;

                                    case "cta_catalog":
                                        if (btn.business_phone_number) {
                                            buttonData = {
                                                name: "cta_catalog",
                                                buttonParamsJson: JSON.stringify({
                                                    business_phone_number:
                                                        btn.business_phone_number,
                                                }),
                                            };
                                        }
                                        break;

                                    case "cta_reminder":
                                        if (btn.display_text) {
                                            buttonData = {
                                                name: "cta_reminder",
                                                buttonParamsJson: JSON.stringify({
                                                    display_text: btn.display_text,
                                                }),
                                            };
                                        }
                                        break;

                                    case "cta_cancel_reminder":
                                        if (btn.display_text) {
                                            buttonData = {
                                                name: "cta_cancel_reminder",
                                                buttonParamsJson: JSON.stringify({
                                                    display_text: btn.display_text,
                                                }),
                                            };
                                        }
                                        break;

                                    case "address_message":
                                        if (btn.display_text) {
                                            buttonData = {
                                                name: "address_message",
                                                buttonParamsJson: JSON.stringify({
                                                    display_text: btn.display_text,
                                                }),
                                            };
                                        }
                                        break;

                                    case "send_location":
                                        if (btn.display_text) {
                                            buttonData = {
                                                name: "send_location",
                                                buttonParamsJson: JSON.stringify({
                                                    display_text: btn.display_text,
                                                }),
                                            };
                                        }
                                        break;

                                    case "open_webview":
                                        if (btn.url && btn.title) {
                                            buttonData = {
                                                name: "open_webview",
                                                buttonParamsJson: JSON.stringify({
                                                    title: btn.title,
                                                    link: {
                                                        in_app_webview:
                                                            btn.in_app_webview !== false,
                                                        url: btn.url,
                                                    },
                                                }),
                                            };
                                        }
                                        break;

                                    case "mpm":
                                        if (btn.product_id) {
                                            buttonData = {
                                                name: "mpm",
                                                buttonParamsJson: JSON.stringify({
                                                    product_id: btn.product_id,
                                                }),
                                            };
                                        }
                                        break;

                                    case "wa_payment_transaction_details":
                                        if (btn.transaction_id) {
                                            buttonData = {
                                                name: "wa_payment_transaction_details",
                                                buttonParamsJson: JSON.stringify({
                                                    transaction_id: btn.transaction_id,
                                                }),
                                            };
                                        }
                                        break;

                                    case "automated_greeting_message_view_catalog":
                                        if (btn.business_phone_number && btn.catalog_product_id) {
                                            buttonData = {
                                                name: "automated_greeting_message_view_catalog",
                                                buttonParamsJson: JSON.stringify({
                                                    business_phone_number:
                                                        btn.business_phone_number,
                                                    catalog_product_id: btn.catalog_product_id,
                                                }),
                                            };
                                        }
                                        break;

                                    case "galaxy_message":
                                        if (btn.flow_id && btn.flow_token) {
                                            buttonData = {
                                                name: "galaxy_message",
                                                buttonParamsJson: JSON.stringify({
                                                    mode: btn.mode || "published",
                                                    flow_message_version:
                                                        btn.flow_message_version || "3",
                                                    flow_token: btn.flow_token,
                                                    flow_id: btn.flow_id,
                                                    flow_cta: btn.flow_cta || "",
                                                    flow_action: btn.flow_action || "navigate",
                                                    flow_action_payload:
                                                        btn.flow_action_payload || {},
                                                    flow_metadata: btn.flow_metadata || {},
                                                }),
                                            };
                                        }
                                        break;

                                    case "single_select":
                                        if (btn.sections && btn.title) {
                                            buttonData = {
                                                name: "single_select",
                                                buttonParamsJson: JSON.stringify({
                                                    title: btn.title,
                                                    sections: btn.sections,
                                                }),
                                            };
                                        }
                                        break;
                                }

                                if (buttonData) {
                                    processedButtons.push(buttonData);
                                }
                            }

                            if (processedButtons.length > 0) {
                                cardObj.nativeFlowMessage = { buttons: processedButtons };
                            }
                        }

                        return cardObj;
                    })
                );

                const payload = proto.Message.InteractiveMessage.create({
                    body: { text: text },
                    footer: { text: footer },
                    header: title ? { title: title } : undefined,
                    carouselMessage: {
                        cards: carouselCards,
                        messageVersion: 1,
                    },
                });

                const msg = generateWAMessageFromContent(
                    jid,
                    {
                        viewOnceMessage: {
                            message: {
                                interactiveMessage: payload,
                            },
                        },
                    },
                    {
                        userJid: this.user.id,
                        quoted: options?.quoted || null,
                    }
                );

                await this.relayMessage(jid, msg.message, {
                    messageId: msg.key.id,
                });

                return msg;
            },
            enumerable: true,
        },
        sendButton: {
            async value(jid, content = {}, options = {}) {
                if (!this.user?.id) {
                    throw new Error("User not authenticated");
                }

                const {
                    text = "",
                    caption = "",
                    title = "",
                    footer = "",
                    buttons = [],
                    hasMediaAttachment = false,
                    image = null,
                    video = null,
                    document = null,
                    mimetype = null,
                    jpegThumbnail = null,
                    location = null,
                    product = null,
                    businessOwnerJid = null,
                } = content;

                if (!Array.isArray(buttons) || buttons.length === 0) {
                    throw new Error("buttons must be a non-empty array");
                }

                const interactiveButtons = [];

                for (let i = 0; i < buttons.length; i++) {
                    const btn = buttons[i];

                    if (!btn || typeof btn !== "object") {
                        throw new Error(`button[${i}] must be an object`);
                    }

                    if (btn.name && btn.buttonParamsJson) {
                        interactiveButtons.push(btn);
                        continue;
                    }

                    if (btn.id || btn.text || btn.displayText) {
                        interactiveButtons.push({
                            name: "quick_reply",
                            buttonParamsJson: JSON.stringify({
                                display_text: btn.text || btn.displayText || `Button ${i + 1}`,
                                id: btn.id || `quick_${i + 1}`,
                            }),
                        });
                        continue;
                    }

                    if (btn.buttonId && btn.buttonText?.displayText) {
                        interactiveButtons.push({
                            name: "quick_reply",
                            buttonParamsJson: JSON.stringify({
                                display_text: btn.buttonText.displayText,
                                id: btn.buttonId,
                            }),
                        });
                        continue;
                    }

                    throw new Error(`button[${i}] has invalid shape`);
                }

                let messageContent = {};
                if (image) {
                    const mediaInput = {};
                    if (Buffer.isBuffer(image)) {
                        mediaInput.image = image;
                    } else if (typeof image === "object" && image.url) {
                        mediaInput.image = { url: image.url };
                    } else if (typeof image === "string") {
                        mediaInput.image = { url: image };
                    }

                    const preparedMedia = await prepareWAMessageMedia(mediaInput, {
                        upload: this.waUploadToServer,
                    });

                    messageContent.header = {
                        title: title || "",
                        hasMediaAttachment: hasMediaAttachment,
                        imageMessage: preparedMedia.imageMessage,
                    };
                } else if (video) {
                    const mediaInput = {};
                    if (Buffer.isBuffer(video)) {
                        mediaInput.video = video;
                    } else if (typeof video === "object" && video.url) {
                        mediaInput.video = { url: video.url };
                    } else if (typeof video === "string") {
                        mediaInput.video = { url: video };
                    }

                    const preparedMedia = await prepareWAMessageMedia(mediaInput, {
                        upload: this.waUploadToServer,
                    });

                    messageContent.header = {
                        title: title || "",
                        hasMediaAttachment: hasMediaAttachment,
                        videoMessage: preparedMedia.videoMessage,
                    };
                } else if (document) {
                    const mediaInput = { document: {} };

                    if (Buffer.isBuffer(document)) {
                        mediaInput.document = document;
                    } else if (typeof document === "object" && document.url) {
                        mediaInput.document = { url: document.url };
                    } else if (typeof document === "string") {
                        mediaInput.document = { url: document };
                    }

                    if (mimetype) {
                        if (typeof mediaInput.document === "object") {
                            mediaInput.document.mimetype = mimetype;
                        }
                    }

                    if (jpegThumbnail) {
                        if (typeof mediaInput.document === "object") {
                            if (Buffer.isBuffer(jpegThumbnail)) {
                                mediaInput.document.jpegThumbnail = jpegThumbnail;
                            } else if (typeof jpegThumbnail === "string") {
                                try {
                                    const response = await fetch(jpegThumbnail);
                                    const arrayBuffer = await response.arrayBuffer();
                                    mediaInput.document.jpegThumbnail = Buffer.from(arrayBuffer);
                                } catch {
                                    //
                                }
                            }
                        }
                    }

                    const preparedMedia = await prepareWAMessageMedia(mediaInput, {
                        upload: this.waUploadToServer,
                    });

                    messageContent.header = {
                        title: title || "",
                        hasMediaAttachment: hasMediaAttachment,
                        documentMessage: preparedMedia.documentMessage,
                    };
                } else if (location && typeof location === "object") {
                    messageContent.header = {
                        title: title || location.name || "Location",
                        hasMediaAttachment: hasMediaAttachment,
                        locationMessage: {
                            degreesLatitude:
                                location.degressLatitude || location.degreesLatitude || 0,
                            degreesLongitude:
                                location.degressLongitude || location.degreesLongitude || 0,
                            name: location.name || "",
                            address: location.address || "",
                        },
                    };
                } else if (product && typeof product === "object") {
                    let productImageMessage = null;
                    if (product.productImage) {
                        const mediaInput = {};
                        if (Buffer.isBuffer(product.productImage)) {
                            mediaInput.image = product.productImage;
                        } else if (
                            typeof product.productImage === "object" &&
                            product.productImage.url
                        ) {
                            mediaInput.image = {
                                url: product.productImage.url,
                            };
                        } else if (typeof product.productImage === "string") {
                            mediaInput.image = {
                                url: product.productImage,
                            };
                        }

                        const preparedMedia = await prepareWAMessageMedia(mediaInput, {
                            upload: this.waUploadToServer,
                        });
                        productImageMessage = preparedMedia.imageMessage;
                    }

                    messageContent.header = {
                        title: title || product.title || "Product",
                        hasMediaAttachment: hasMediaAttachment,
                        productMessage: {
                            product: {
                                productImage: productImageMessage,
                                productId: product.productId || "",
                                title: product.title || "",
                                description: product.description || "",
                                currencyCode: product.currencyCode || "USD",
                                priceAmount1000: parseInt(product.priceAmount1000) || 0,
                                retailerId: product.retailerId || "",
                                url: product.url || "",
                                productImageCount: product.productImageCount || 1,
                            },
                            businessOwnerJid:
                                businessOwnerJid || product.businessOwnerJid || this.user.id,
                        },
                    };
                } else if (title) {
                    messageContent.header = {
                        title: title,
                        hasMediaAttachment: false,
                    };
                }

                const hasMedia = !!(image || video || document || location || product);
                const bodyText = hasMedia ? caption : text || caption;

                if (bodyText) {
                    messageContent.body = { text: bodyText };
                }

                if (footer) {
                    messageContent.footer = { text: footer };
                }

                messageContent.nativeFlowMessage = {
                    buttons: interactiveButtons,
                };

                const payload = proto.Message.InteractiveMessage.create(messageContent);

                const msg = generateWAMessageFromContent(
                    jid,
                    {
                        viewOnceMessage: {
                            message: {
                                interactiveMessage: payload,
                            },
                        },
                    },
                    {
                        userJid: this.user.id,
                        quoted: options?.quoted || null,
                    }
                );
                const isGroup = jid.endsWith("@g.us");
                const additionalNodes = [
                    {
                        tag: "biz",
                        attrs: {},
                        content: [
                            {
                                tag: "interactive",
                                attrs: {
                                    type: "native_flow",
                                    v: "1",
                                },
                                content: [
                                    {
                                        tag: "native_flow",
                                        attrs: {
                                            v: "9",
                                            name: "mixed",
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                ];

                if (!isGroup) {
                    additionalNodes.push({
                        tag: "bot",
                        attrs: { biz_bot: "1" },
                    });
                }

                await this.relayMessage(jid, msg.message, {
                    messageId: msg.key.id,
                    additionalNodes,
                });

                return msg;
            },
            enumerable: true,
        },
        reply: {
            async value(jid, text = "", quoted, options = {}) {
                const chat = conn.chats[jid];
                const ephemeral =
                    chat?.metadata?.ephemeralDuration || chat?.ephemeralDuration || false;

                const thumbs = [
                    "https://files.catbox.moe/x1aogp.png",
                    "https://files.catbox.moe/x1aogp.png",
                    "https://files.catbox.moe/x1aogp.png",
                    "https://files.catbox.moe/x1aogp.png",
                    "https://files.catbox.moe/x1aogp.png",
                ];
                const thumb = thumbs[Math.floor(Math.random() * thumbs.length)];

                text = _isStr(text) ? text.trim() : String(text || "");

                const isGroup = jid.endsWith("@g.us");
                const baseOptions = {
                    quoted,
                    ephemeralExpiration: ephemeral,
                };

                const messageContent = { text, ...options };

                if (global.db?.data?.settings?.[conn.user?.jid]?.adReply) {
                    messageContent.contextInfo = {
                        externalAdReply: {
                            title: global.config?.watermark || "",
                            body: global.config?.author || "",
                            thumbnailUrl: thumb,
                            mediaType: 1,
                            renderLargerThumbnail: false,
                        },
                    };
                }

                if (isGroup) {
                    return conn.sendMessage(jid, messageContent, baseOptions);
                }

                const msg = generateWAMessageFromContent(
                    jid,
                    { extendedTextMessage: messageContent },
                    {
                        userJid: conn.user.id,
                        quoted: quoted || null,
                    }
                );

                await conn.relayMessage(jid, msg.message, {
                    messageId: msg.key.id,
                    ephemeralExpiration: ephemeral,
                    additionalNodes: [
                        {
                            tag: "bot",
                            attrs: { biz_bot: "1" },
                        },
                    ],
                });

                return msg;
            },
            enumerable: true,
        },
        downloadM: {
            async value(m, type) {
                if (!m || !(m.url || m.directPath)) return Buffer.alloc(0);

                const stream = await downloadContentFromMessage(m, type);
                const chunks = [];

                for await (const chunk of stream) {
                    chunks.push(chunk);
                }

                return Buffer.concat(chunks);
            },
            enumerable: true,
        },
        getName: {
            value: async function (jid = "", withoutContact = false) {
                jid = conn.decodeJid(jid);
                withoutContact = conn.withoutContact || withoutContact;

                if (!jid) return "";

                if (_isGroupJid(jid)) {
                    const chat = conn.chats[jid];
                    if (chat?.subject) return chat.subject;

                    const cached = conn._groupMetaCache.get(jid);
                    if (cached) return cached.subject;

                    try {
                        const md = await conn.groupMetadata(jid);
                        if (md) {
                            conn._groupMetaCache.set(jid, md);
                            return md.subject || chat?.name || jid;
                        }
                    } catch {
                        return chat?.name || jid;
                    }
                }

                const self =
                    conn.user?.lid && areJidsSameUser ? areJidsSameUser(jid, conn.user.lid) : false;

                const v =
                    jid === "12066409886@s.whatsapp.net"
                        ? {
                              jid,
                              vname: "WhatsApp",
                          }
                        : self
                          ? conn.user
                          : conn.chats[jid] || {};

                const name = v.name || v.vname || v.notify || v.verifiedName || v.subject;
                return withoutContact ? "" : name || jid;
            },
            enumerable: true,
        },
        loadMessage: {
            value(messageID) {
                if (!messageID) return null;

                const cached = conn._msgIndex.get(messageID);
                if (cached) return cached;

                for (const chatData of Object.values(conn.chats || {})) {
                    const msg = chatData?.messages?.[messageID];
                    if (msg) {
                        conn._msgIndex.set(messageID, msg);
                        return msg;
                    }
                }

                return null;
            },
            enumerable: true,
        },
        Pairing: {
            value: String.fromCharCode(67, 85, 77, 73, 67, 85, 77, 73),
            writable: false,
            enumerable: true,
        },
        processMessageStubType: {
            async value(m) {
                if (!m?.messageStubType) return;

                const chat = conn.decodeJid(
                    m.key?.remoteJid || m.message?.senderKeyDistributionMessage?.groupId || ""
                );

                if (!chat || _isStatusJid(chat)) return;

                const name =
                    Object.entries(WAMessageStubType).find(
                        ([, v]) => v === m.messageStubType
                    )?.[0] || "UNKNOWN";

                const author = conn.decodeJid(
                    m.key?.participant || m.participant || m.key?.remoteJid || ""
                );

                conn.logger.warn({
                    module: "PROTOCOL",
                    event: name,
                    chat,
                    author,
                    params: m.messageStubParameters || [],
                });
            },
            enumerable: true,
        },
        insertAllGroup: {
            async value() {
                try {
                    const allGroups = await conn.groupFetchAllParticipating().catch(() => ({}));

                    if (!allGroups || typeof allGroups !== "object") {
                        return conn.chats || {};
                    }

                    const existing = conn.chats || (conn.chats = Object.create(null));
                    const now = _now();
                    const activeGroups = new Set();

                    for (const [gid, meta] of Object.entries(allGroups)) {
                        if (!_isGroupJid(gid)) continue;

                        activeGroups.add(gid);
                        const chat = existing[gid] || (existing[gid] = { id: gid });

                        chat.subject = meta.subject || chat.subject || "";
                        chat.metadata = meta;
                        chat.isChats = true;
                        chat.lastSync = now;

                        conn._groupMetaCache.set(gid, meta);
                    }

                    for (const jid in existing) {
                        if (_isGroupJid(jid) && !activeGroups.has(jid)) {
                            const chatData = existing[jid];
                            if (chatData?.lastSync !== now) {
                                delete existing[jid];
                            }
                        }
                    }

                    return existing;
                } catch (e) {
                    conn.logger.error(e);
                    return conn.chats || {};
                }
            },
            enumerable: true,
        },
        pushMessage: {
            async value(m) {
                if (!m) return;

                const messages = Array.isArray(m) ? m : [m];

                for (const message of messages) {
                    if (!message) continue;

                    try {
                        if (
                            message.messageStubType &&
                            message.messageStubType !== WAMessageStubType.CIPHERTEXT
                        ) {
                            conn.processMessageStubType(message).catch((e) => conn.logger.error(e));
                        }

                        const msgObj = message.message || {};
                        const mtypeKeys = Object.keys(msgObj);
                        if (!mtypeKeys.length) continue;

                        let mtype = mtypeKeys.find(
                            (k) =>
                                k !== "senderKeyDistributionMessage" && k !== "messageContextInfo"
                        );
                        if (!mtype) mtype = mtypeKeys[mtypeKeys.length - 1];

                        const chat = conn.decodeJid(
                            message.key?.remoteJid ||
                                msgObj?.senderKeyDistributionMessage?.groupId ||
                                ""
                        );

                        if (!chat || _isStatusJid(chat)) continue;

                        const isGroup = _isGroupJid(chat);
                        let chats = conn.chats[chat];

                        if (!chats) {
                            chats = conn.chats[chat] = {
                                id: chat,
                                isChats: true,
                            };

                            if (isGroup && !conn._groupMetaCache.get(chat)) {
                                conn.groupMetadata(chat)
                                    .then((md) => {
                                        if (md) {
                                            chats.subject = md.subject;
                                            chats.metadata = md;
                                            conn._groupMetaCache.set(chat, md);
                                        }
                                    })
                                    .catch(() => {});
                            }
                        }
                        const ctx = msgObj[mtype]?.contextInfo;
                        if (ctx?.quotedMessage && ctx.stanzaId) {
                            const qChat = conn.decodeJid(ctx.remoteJid || ctx.participant || chat);

                            if (qChat && !_isStatusJid(qChat)) {
                                const quotedMsg = {
                                    key: {
                                        remoteJid: qChat,
                                        fromMe:
                                            conn.user?.jid && areJidsSameUser
                                                ? areJidsSameUser(conn.user.jid, qChat)
                                                : false,
                                        id: ctx.stanzaId,
                                        participant: conn.decodeJid(ctx.participant),
                                    },
                                    message: ctx.quotedMessage,
                                    ...(qChat.endsWith("@g.us")
                                        ? {
                                              participant: conn.decodeJid(ctx.participant),
                                          }
                                        : {}),
                                };

                                const qm =
                                    conn.chats[qChat] ||
                                    (conn.chats[qChat] = {
                                        id: qChat,
                                        isChats: !_isGroupJid(qChat),
                                    });
                                qm.messages ||= Object.create(null);

                                if (!qm.messages[ctx.stanzaId]) {
                                    qm.messages[ctx.stanzaId] = quotedMsg;
                                    conn._msgIndex.set(ctx.stanzaId, quotedMsg);
                                }
                                const msgKeys = Object.keys(qm.messages);
                                if (msgKeys.length > 40) {
                                    for (let i = 0; i < msgKeys.length - 30; i++) {
                                        delete qm.messages[msgKeys[i]];
                                    }
                                }
                            }
                        }
                        let sender;
                        if (isGroup) {
                            sender = conn.decodeJid(
                                (message.key?.fromMe && conn.user?.lid) ||
                                    message.participant ||
                                    message.key?.participant ||
                                    chat
                            );

                            if (sender && sender !== chat) {
                                const sChat =
                                    conn.chats[sender] ||
                                    (conn.chats[sender] = {
                                        id: sender,
                                    });
                                sChat.name ||= message.pushName || sChat.name || "";
                            }
                        } else {
                            sender = message.key?.fromMe && conn.user?.lid ? conn.user.lid : chat;
                            chats.name ||= message.pushName || chats.name || "";
                        }

                        if (
                            mtype !== "senderKeyDistributionMessage" &&
                            mtype !== "messageContextInfo" &&
                            mtype !== "protocolMessage"
                        ) {
                            const fromMe =
                                message.key?.fromMe ||
                                (conn.user?.lid && sender && areJidsSameUser
                                    ? areJidsSameUser(sender, conn.user.lid)
                                    : false);

                            if (
                                !fromMe &&
                                message.message &&
                                message.messageStubType !== WAMessageStubType.CIPHERTEXT &&
                                message.key?.id
                            ) {
                                delete msgObj.messageContextInfo;
                                delete msgObj.senderKeyDistributionMessage;

                                chats.messages ||= Object.create(null);
                                chats.messages[message.key.id] = message;
                                conn._msgIndex.set(message.key.id, message);

                                const msgKeys = Object.keys(chats.messages);
                                if (msgKeys.length > 40) {
                                    for (let i = 0; i < msgKeys.length - 30; i++) {
                                        delete chats.messages[msgKeys[i]];
                                    }
                                }
                            }
                        }

                        chats.isChats = true;
                    } catch (e) {
                        conn.logger.error(e);
                    }
                }
            },
            enumerable: true,
        },
        serializeM: {
            value(m) {
                return smsg(conn, m);
            },
        },
        cleanup: {
            value() {
                clearInterval(cleanupInterval);
                conn._msgIndex.clear();
                conn._groupMetaCache.clear();
                jidCache.clear();
            },
        },
    });

    if (conn.user?.lid) {
        conn.user.jid = conn.decodeJid(conn.user.lid);
    }

    store.bind(conn);
    return conn;
}
