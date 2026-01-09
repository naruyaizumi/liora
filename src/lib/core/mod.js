import {
    proto,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateWAMessage,
} from "baileys";

export class mods {
    constructor(conn) {
        this.conn = conn;
    }

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

        return this.conn.sendMessage(jid, content, options);
    }

    async sendAlbum(jid, content, options = {}) {
        if (!this.conn.user?.id) {
            throw new Error("User not authenticated");
        }

        if (!content?.album || !Array.isArray(content.album) || content.album.length === 0) {
            throw new Error("Album content with items array is required");
        }

        const items = content.album;

        const expectedImageCount = items.filter((item) => item?.image).length;
        const expectedVideoCount = items.filter((item) => item?.video).length;

        const messageSecret = new Uint8Array(32);
        crypto.getRandomValues(messageSecret);

        const messageContent = {
            albumMessage: {
                expectedImageCount,
                expectedVideoCount,
            },
            messageContextInfo: {
                messageSecret: messageSecret,
            },
        };

        const generationOptions = {
            userJid: this.conn.user.id,
            upload: this.conn.waUploadToServer,
            quoted: options?.quoted || null,
            ephemeralExpiration: options?.quoted?.expiration ?? 0,
        };

        const album = generateWAMessageFromContent(jid, messageContent, generationOptions);

        await this.conn.relayMessage(album.key.remoteJid, album.message, {
            messageId: album.key.id,
        });

        const mediaMessages = [];

        for (let i = 0; i < items.length; i++) {
            const contentItem = items[i];

            const mediaSecret = new Uint8Array(32);
            crypto.getRandomValues(mediaSecret);

            let mediaMsg;

            if (contentItem.image) {
                const mediaInput = {};
                if (contentItem.image instanceof Uint8Array) {
                    mediaInput.image = contentItem.image;
                } else if (typeof contentItem.image === "object" && contentItem.image.url) {
                    mediaInput.image = { url: contentItem.image.url };
                } else if (typeof contentItem.image === "string") {
                    mediaInput.image = { url: contentItem.image };
                }

                if (contentItem.caption) {
                    mediaInput.caption = contentItem.caption;
                }

                mediaMsg = await generateWAMessage(album.key.remoteJid, mediaInput, {
                    upload: this.conn.waUploadToServer,
                    ephemeralExpiration: options?.quoted?.expiration ?? 0,
                });
            } else if (contentItem.video) {
                const mediaInput = {};
                if (contentItem.video instanceof Uint8Array) {
                    mediaInput.video = contentItem.video;
                } else if (typeof contentItem.video === "object" && contentItem.video.url) {
                    mediaInput.video = { url: contentItem.video.url };
                } else if (typeof contentItem.video === "string") {
                    mediaInput.video = { url: contentItem.video };
                }

                if (contentItem.caption) {
                    mediaInput.caption = contentItem.caption;
                }

                if (contentItem.mimetype) {
                    mediaInput.mimetype = contentItem.mimetype;
                }

                mediaMsg = await generateWAMessage(album.key.remoteJid, mediaInput, {
                    upload: this.conn.waUploadToServer,
                    ephemeralExpiration: options?.quoted?.expiration ?? 0,
                });
            } else {
                throw new Error(`Item at index ${i} must contain either image or video`);
            }

            mediaMsg.message.messageContextInfo = {
                messageSecret: mediaSecret,
                messageAssociation: {
                    associationType: 1,
                    parentMessageKey: album.key,
                },
            };

            mediaMessages.push(mediaMsg);

            await this.conn.relayMessage(mediaMsg.key.remoteJid, mediaMsg.message, {
                messageId: mediaMsg.key.id,
            });

            if (i < items.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }

        return {
            album,
            mediaMessages,
        };
    }

    async sendCard(jid, content = {}, options = {}) {
        if (!this.conn.user?.id) {
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
                if (mediaContent instanceof Uint8Array) {
                    mediaInput[mediaType] = mediaContent;
                } else if (typeof mediaContent === "object" && mediaContent.url) {
                    mediaInput[mediaType] = { url: mediaContent.url };
                } else if (typeof mediaContent === "string") {
                    mediaInput[mediaType] = { url: mediaContent };
                } else {
                    throw new Error("Media must be Uint8Array, URL string, or { url: string }");
                }

                const preparedMedia = await prepareWAMessageMedia(mediaInput, {
                    upload: this.conn.waUploadToServer,
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
                userJid: this.conn.user.id,
                quoted: options?.quoted || null,
            }
        );

        await this.conn.relayMessage(jid, msg.message, {
            messageId: msg.key.id,
        });

        return msg;
    }

    async sendButton(jid, content = {}, options = {}) {
        if (!this.conn.user?.id) {
            throw new Error("User not authenticated");
        }

        const {
            text = "",
            caption = "",
            title = "",
            footer = "",
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

        if (!Array.isArray(interactiveButtons) || interactiveButtons.length === 0) {
            throw new Error("interactiveButtons must be a non-empty array");
        }

        const processedButtons = [];
        for (let i = 0; i < interactiveButtons.length; i++) {
            const btn = interactiveButtons[i];

            if (!btn || typeof btn !== "object") {
                throw new Error(`interactiveButton[${i}] must be an object`);
            }

            if (btn.name && btn.buttonParamsJson) {
                processedButtons.push(btn);
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
                processedButtons.push({
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.buttonText.displayText,
                        id: btn.buttonId,
                    }),
                });
                continue;
            }

            throw new Error(`interactiveButton[${i}] has invalid shape`);
        }

        let messageContent = {};

        if (image) {
            const mediaInput = {};
            if (image instanceof Uint8Array) {
                mediaInput.image = image;
            } else if (typeof image === "object" && image.url) {
                mediaInput.image = { url: image.url };
            } else if (typeof image === "string") {
                mediaInput.image = { url: image };
            }

            const preparedMedia = await prepareWAMessageMedia(mediaInput, {
                upload: this.conn.waUploadToServer,
            });

            messageContent.header = {
                title: title || "",
                hasMediaAttachment: hasMediaAttachment || true,
                imageMessage: preparedMedia.imageMessage,
            };
        } else if (video) {
            const mediaInput = {};
            if (video instanceof Uint8Array) {
                mediaInput.video = video;
            } else if (typeof video === "object" && video.url) {
                mediaInput.video = { url: video.url };
            } else if (typeof video === "string") {
                mediaInput.video = { url: video };
            }

            const preparedMedia = await prepareWAMessageMedia(mediaInput, {
                upload: this.conn.waUploadToServer,
            });

            messageContent.header = {
                title: title || "",
                hasMediaAttachment: hasMediaAttachment || true,
                videoMessage: preparedMedia.videoMessage,
            };
        } else if (document) {
            const mediaInput = { document: {} };

            if (document instanceof Uint8Array) {
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
                if (jpegThumbnail instanceof Uint8Array) {
                    if (typeof mediaInput.document === "object") {
                        mediaInput.document.jpegThumbnail = jpegThumbnail;
                    }
                } else if (typeof jpegThumbnail === "string") {
                    try {
                        const response = await fetch(jpegThumbnail);
                        const arrayBuffer = await response.arrayBuffer();
                        if (typeof mediaInput.document === "object") {
                            mediaInput.document.jpegThumbnail = new Uint8Array(arrayBuffer);
                        }
                    } catch {
                        //
                    }
                }
            }

            const preparedMedia = await prepareWAMessageMedia(mediaInput, {
                upload: this.conn.waUploadToServer,
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
                if (product.productImage instanceof Uint8Array) {
                    mediaInput.image = product.productImage;
                } else if (typeof product.productImage === "object" && product.productImage.url) {
                    mediaInput.image = { url: product.productImage.url };
                } else if (typeof product.productImage === "string") {
                    mediaInput.image = { url: product.productImage };
                }

                const preparedMedia = await prepareWAMessageMedia(mediaInput, {
                    upload: this.conn.waUploadToServer,
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
                        businessOwnerJid || product.businessOwnerJid || this.conn.user.id,
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
                        externalAdReply.thumbnail instanceof Uint8Array && {
                            thumbnail: externalAdReply.thumbnail,
                        }),
                    ...(externalAdReply.jpegThumbnail &&
                        externalAdReply.jpegThumbnail instanceof Uint8Array && {
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
                userJid: this.conn.user.id,
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

        await this.conn.relayMessage(jid, msg.message, {
            messageId: msg.key.id,
            additionalNodes,
        });

        return msg;
    }
}
