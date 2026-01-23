/**
 * @file Advanced message sending utilities for Liora bot
 * @module core/mods
 * @description Enhanced message sending capabilities including albums, cards,
 * interactive buttons, and rich media support beyond standard WhatsApp messages.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import {
    proto,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateWAMessage,
} from "baileys";

/**
 * Advanced message sender with rich media support
 * @class mods
 * @description Provides enhanced messaging capabilities including albums,
 * interactive cards, buttons, and various media types with proper formatting.
 */
export class mods {
    /**
     * Creates mods instance with connection
     * @constructor
     * @param {Object} sock - Connection object
     */
    constructor(sock) {
        this.sock = sock;
    }

    /**
     * Unified message sending interface with content detection
     * @async
     * @method client
     * @param {string} jid - Target JID
     * @param {Object} content - Message content
     * @param {Object} options - Send options
     * @returns {Promise<Object>} Message send result
     *
     * @contentDetection
     * - album: Multi-image/video albums
     * - cards: Carousel card interfaces
     * - button/interactiveButtons: Interactive buttons
     * - default: Standard message sending
     */
    async client(jid, content, options = {}) {
        if (content.album) {
            return this.sendAlbum(jid, content, options);
        }

        if (content.cards) {
            return this.sendCard(jid, content, options);
        }

        if (content.button || content.interactiveButtons) {
            return this.sendButton(jid, content, options);
        }

        return this.sock.sendMessage(jid, content, options);
    }

    /**
     * Sends media album (multiple images/videos as single message)
     * @async
     * @method sendAlbum
     * @param {string} jid - Target JID
     * @param {Object} content - Album content
     * @param {Object} options - Send options
     * @returns {Promise<{album: Object, mediaMessages: Array}>} Album and media messages
     *
     * @albumSpecification
     * - content.album: Array of {image|video, caption?, mimetype?}
     * - Supports up to 30 items (WhatsApp limit)
     * - Automatic media type detection
     * - Sequential sending with delays
     */
    async sendAlbum(jid, content, options = {}) {
        if (!this.sock.user?.id) {
            throw new Error("User not authenticated");
        }

        if (!content?.album || !Array.isArray(content.album) || content.album.length === 0) {
            throw new Error("Album content with items array is required");
        }

        const items = content.album;

        const imgCount = items.filter((item) => item?.image).length;
        const vidCount = items.filter((item) => item?.video).length;

        const msgSecret = new Uint8Array(32);
        crypto.getRandomValues(msgSecret);

        const msgContent = {
            albumMessage: {
                expectedImageCount: imgCount,
                expectedVideoCount: vidCount,
            },
            messageContextInfo: {
                messageSecret: msgSecret,
            },
        };

        const genOpt = {
            userJid: this.sock.user.id,
            upload: this.sock.waUploadToServer,
            quoted: options?.quoted || null,
            ephemeralExpiration: options?.quoted?.expiration ?? 0,
        };

        const album = generateWAMessageFromContent(jid, msgContent, genOpt);

        await this.sock.relayMessage(album.key.remoteJid, album.message, {
            messageId: album.key.id,
        });

        const mediaMsgs = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            const mediaSecret = new Uint8Array(32);
            crypto.getRandomValues(mediaSecret);

            let mediaMsg;

            if (item.image) {
                const mediaInput = {};
                if (Buffer.isBuffer(item.image)) {
                    mediaInput.image = item.image;
                } else if (typeof item.image === "object" && item.image.url) {
                    mediaInput.image = { url: item.image.url };
                } else if (typeof item.image === "string") {
                    mediaInput.image = { url: item.image };
                }

                if (item.caption) {
                    mediaInput.caption = item.caption;
                }

                mediaMsg = await generateWAMessage(album.key.remoteJid, mediaInput, {
                    upload: this.sock.waUploadToServer,
                    ephemeralExpiration: options?.quoted?.expiration ?? 0,
                });
            } else if (item.video) {
                const mediaInput = {};
                if (Buffer.isBuffer(item.video)) {
                    mediaInput.video = item.video;
                } else if (typeof item.video === "object" && item.video.url) {
                    mediaInput.video = { url: item.video.url };
                } else if (typeof item.video === "string") {
                    mediaInput.video = { url: item.video };
                }

                if (item.caption) {
                    mediaInput.caption = item.caption;
                }

                if (item.mimetype) {
                    mediaInput.mimetype = item.mimetype;
                }

                mediaMsg = await generateWAMessage(album.key.remoteJid, mediaInput, {
                    upload: this.sock.waUploadToServer,
                    ephemeralExpiration: options?.quoted?.expiration ?? 0,
                });
            } else {
                throw new Error(`Item ${i} must have image or video`);
            }

            mediaMsg.message.messageContextInfo = {
                messageSecret: mediaSecret,
                messageAssociation: {
                    associationType: 1,
                    parentMessageKey: album.key,
                },
            };

            mediaMsgs.push(mediaMsg);

            await this.sock.relayMessage(mediaMsg.key.remoteJid, mediaMsg.message, {
                messageId: mediaMsg.key.id,
            });

            if (i < items.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }

        return {
            album,
            mediaMessages: mediaMsgs,
        };
    }

    /**
     * Sends interactive carousel cards
     * @async
     * @method sendCard
     * @param {string} jid - Target JID
     * @param {Object} content - Card content
     * @param {Object} options - Send options
     * @returns {Promise<Object>} Message send result
     *
     * @cardSpecification
     * - content.cards: Array of card objects
     * - Each card: {image|video, title?, body?, footer?, buttons?}
     * - Maximum 10 cards (WhatsApp limit)
     * - View-once message wrapper
     */
    async sendCard(jid, content = {}, options = {}) {
        if (!this.sock.user?.id) {
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
                let type = null;
                let media = null;

                if (card.image) {
                    type = "image";
                    media = card.image;
                } else if (card.video) {
                    type = "video";
                    media = card.video;
                } else {
                    throw new Error("Card must have image or video");
                }

                const mediaInput = {};
                if (Buffer.isBuffer(media)) {
                    mediaInput[type] = media;
                } else if (typeof media === "object" && media.url) {
                    mediaInput[type] = { url: media.url };
                } else if (typeof media === "string") {
                    mediaInput[type] = { url: media };
                } else {
                    throw new Error("Media must be Buffer, URL string, or {url: string}");
                }

                const prepped = await prepareWAMessageMedia(mediaInput, {
                    upload: this.sock.waUploadToServer,
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

                if (type === "image") {
                    cardObj.header.imageMessage = prepped.imageMessage;
                } else if (type === "video") {
                    cardObj.header.videoMessage = prepped.videoMessage;
                }

                if (Array.isArray(card.buttons) && card.buttons.length > 0) {
                    cardObj.nativeFlowMessage = {
                        buttons: card.buttons.map((btn) => ({
                            name: btn.name || "quick_reply",
                            buttonParamsJson: btn.buttonParamsJson || JSON.stringify(btn),
                        })),
                    };
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
                userJid: this.sock.user.id,
                quoted: options?.quoted || null,
            }
        );

        await this.sock.relayMessage(jid, msg.message, {
            messageId: msg.key.id,
        });

        return msg;
    }

    /**
     * Sends interactive button messages with rich media support
     * @async
     * @method sendButton
     * @param {string} jid - Target JID
     * @param {Object} content - Button content
     * @param {Object} options - Send options
     * @returns {Promise<Object>} Message send result
     *
     * @mediaSupport
     * - Image: Header images with captions
     * - Video: Header videos with captions
     * - Document: Files with thumbnails
     * - Location: Map locations
     * - Product: Product catalogs
     * - Text-only: Simple headers
     *
     * @buttonTypes
     * - Quick reply buttons
     * - URL buttons
     * - Call buttons
     * - Copy code buttons
     * - Native flow buttons
     */
    async sendButton(jid, content = {}, options = {}) {
        if (!this.sock.user?.id) {
            throw new Error("User not authenticated");
        }

        const {
            text = "",
            caption = "",
            title = "",
            footer = "",
            buttons = [],
            interactiveButtons = [],
            hasMediaAttachment = false,
            image = null,
            video = null,
            document = null,
            mimetype = null,
            fileName = null,
            fileLength = null,
            pageCount = null,
            jpegThumbnail = null,
            location = null,
            product = null,
            businessOwnerJid = null,
            contextInfo = null,
            externalAdReply = null,
        } = content;

        const allButtons = [...buttons, ...interactiveButtons];

        if (!Array.isArray(allButtons) || allButtons.length === 0) {
            throw new Error("buttons or interactiveButtons must be a non-empty array");
        }

        const processedButtons = [];
        for (let i = 0; i < allButtons.length; i++) {
            const btn = allButtons[i];

            if (!btn || typeof btn !== "object") {
                throw new Error(`button[${i}] must be an object`);
            }

            if (btn.name && btn.buttonParamsJson) {
                processedButtons.push(btn);
                continue;
            }

            if (btn.nativeFlowInfo && btn.nativeFlowInfo.name) {
                processedButtons.push({
                    name: btn.nativeFlowInfo.name,
                    buttonParamsJson: btn.nativeFlowInfo.paramsJson || JSON.stringify({}),
                });
                continue;
            }

            if (btn.id || btn.text || btn.displayText) {
                processedButtons.push({
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.text || btn.displayText || `Button ${i + 1}`,
                        id: btn.id || `quick_${i + 1}`,
                    }),
                });
                continue;
            }

            if (btn.buttonId && btn.buttonText?.displayText) {
                if (btn.type === 4 || btn.nativeFlowInfo) {
                    const flowInfo = btn.nativeFlowInfo || {};
                    processedButtons.push({
                        name: flowInfo.name || "quick_reply",
                        buttonParamsJson:
                            flowInfo.paramsJson ||
                            JSON.stringify({
                                display_text: btn.buttonText.displayText,
                                id: btn.buttonId,
                            }),
                    });
                } else {
                    processedButtons.push({
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                            display_text: btn.buttonText.displayText,
                            id: btn.buttonId,
                        }),
                    });
                }
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
                upload: this.sock.waUploadToServer,
            });

            messageContent.header = {
                title: title || "",
                hasMediaAttachment: hasMediaAttachment || true,
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
                upload: this.sock.waUploadToServer,
            });

            messageContent.header = {
                title: title || "",
                hasMediaAttachment: hasMediaAttachment || true,
                videoMessage: preparedMedia.videoMessage,
            };
        } else if (document) {
            const mediaInput = { document: {} };

            if (Buffer.isBuffer(document)) {
                mediaInput.document = {
                    buffer: document,
                    ...(mimetype && { mimetype }),
                    ...(fileName && { fileName }),
                    ...(fileLength !== null && { fileLength }),
                    ...(pageCount !== null && { pageCount }),
                };
            } else if (typeof document === "object" && document.url) {
                mediaInput.document = {
                    url: document.url,
                    ...(mimetype && { mimetype }),
                    ...(fileName && { fileName }),
                    ...(fileLength !== null && { fileLength }),
                    ...(pageCount !== null && { pageCount }),
                };
            } else if (typeof document === "string") {
                mediaInput.document = {
                    url: document,
                    ...(mimetype && { mimetype }),
                    ...(fileName && { fileName }),
                    ...(fileLength !== null && { fileLength }),
                    ...(pageCount !== null && { pageCount }),
                };
            }

            if (jpegThumbnail) {
                if (Buffer.isBuffer(jpegThumbnail)) {
                    if (typeof mediaInput.document === "object") {
                        mediaInput.document.jpegThumbnail = jpegThumbnail;
                    }
                } else if (typeof jpegThumbnail === "string") {
                    try {
                        const res = await fetch(jpegThumbnail);
                        const arr = await res.arrayBuffer();
                        if (typeof mediaInput.document === "object") {
                            mediaInput.document.jpegThumbnail = Buffer.from(arr);
                        }
                    } catch {
                        //
                    }
                }
            }

            const preparedMedia = await prepareWAMessageMedia(mediaInput, {
                upload: this.sock.waUploadToServer,
            });

            if (preparedMedia.documentMessage) {
                if (fileName) preparedMedia.documentMessage.fileName = fileName;
                if (fileLength !== null)
                    preparedMedia.documentMessage.fileLength = fileLength.toString();
                if (pageCount !== null) preparedMedia.documentMessage.pageCount = pageCount;
                if (mimetype) preparedMedia.documentMessage.mimetype = mimetype;
            }

            messageContent.header = {
                title: title || "",
                hasMediaAttachment: hasMediaAttachment || true,
                documentMessage: preparedMedia.documentMessage,
            };
        } else if (location && typeof location === "object") {
            messageContent.header = {
                title: title || location.name || "Location",
                hasMediaAttachment: hasMediaAttachment || false,
                locationMessage: {
                    degreesLatitude: location.degressLatitude || location.degreesLatitude || 0,
                    degreesLongitude: location.degressLongitude || location.degreesLongitude || 0,
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
                } else if (typeof product.productImage === "object" && product.productImage.url) {
                    mediaInput.image = { url: product.productImage.url };
                } else if (typeof product.productImage === "string") {
                    mediaInput.image = { url: product.productImage };
                }

                const preparedMedia = await prepareWAMessageMedia(mediaInput, {
                    upload: this.sock.waUploadToServer,
                });
                productImageMessage = preparedMedia.imageMessage;
            }

            messageContent.header = {
                title: title || product.title || "Product",
                hasMediaAttachment: hasMediaAttachment || false,
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
                        businessOwnerJid || product.businessOwnerJid || this.sock.user.id,
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
            buttons: processedButtons,
        };

        if (contextInfo && typeof contextInfo === "object") {
            messageContent.contextInfo = { ...contextInfo };
        } else if (externalAdReply && typeof externalAdReply === "object") {
            messageContent.contextInfo = {
                externalAdReply: {
                    title: externalAdReply.title || "",
                    body: externalAdReply.body || "",
                    mediaType: externalAdReply.mediaType || 1,
                    sourceUrl: externalAdReply.sourceUrl || externalAdReply.url || "",
                    thumbnailUrl: externalAdReply.thumbnailUrl || externalAdReply.thumbnail || "",
                    renderLargerThumbnail: externalAdReply.renderLargerThumbnail || false,
                    showAdAttribution: externalAdReply.showAdAttribution !== false,
                    containsAutoReply: externalAdReply.containsAutoReply || false,
                    ...(externalAdReply.mediaUrl && {
                        mediaUrl: externalAdReply.mediaUrl,
                    }),
                    ...(externalAdReply.thumbnail &&
                        Buffer.isBuffer(externalAdReply.thumbnail) && {
                            thumbnail: externalAdReply.thumbnail,
                        }),
                    ...(externalAdReply.jpegThumbnail &&
                        Buffer.isBuffer(externalAdReply.jpegThumbnail) && {
                            jpegThumbnail: externalAdReply.jpegThumbnail,
                        }),
                },
            };
        }

        if (options.mentionedJid) {
            if (messageContent.contextInfo) {
                messageContent.contextInfo.mentionedJid = options.mentionedJid;
            } else {
                messageContent.contextInfo = {
                    mentionedJid: options.mentionedJid,
                };
            }
        }

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
                userJid: this.sock.user.id,
                quoted: options?.quoted || null,
            }
        );

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

        await this.sock.relayMessage(jid, msg.message, {
            messageId: msg.key.id,
            additionalNodes,
        });

        return msg;
    }
}
