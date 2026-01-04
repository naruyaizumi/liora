import bind from "./store/store.js";
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
  generateMessageID,
  generateWAMessageContent,
  //jidNormalizedUser,
  //isJidGroup,
  //isPnUser,
} from "baileys";

const _isStr = (v) => typeof v === "string";
const _isGroupJid = (id = "") => id && id.endsWith("@g.us");

const _hidden = (target, key, value) =>
  Object.defineProperty(target, key, {
    value,
    enumerable: false,
    configurable: false,
    writable: true,
  });

const _decode = (raw) => {
  if (!raw || typeof raw !== "string") return raw || null;

  const cleaned = raw.replace(/:\d+@/, "@");
  return cleaned.includes("@")
    ? cleaned
    : /^[0-9]+$/.test(cleaned)
      ? cleaned + "@s.whatsapp.net"
      : cleaned;
};

const asyncPipeline = {
  tasks: [],
  running: false,

  async add(task) {
    this.tasks.push(task);
    if (!this.running) {
      this.running = true;
      setImmediate(() => this.process());
    }
  },

  async process() {
    while (this.tasks.length > 0) {
      const batch = this.tasks.splice(0, 10);
      await Promise.all(
        batch.map((task) =>
          task().catch((e) =>
            global.logger?.error({ error: e.message }, "Pipeline error"),
          ),
        ),
      );
    }
    this.running = false;
  },
};

export function naruyaizumi(connectionOptions, options = {}) {
  const conn = makeWASocket(connectionOptions);

  bind(conn);

  Object.defineProperties(conn, {
    decodeJid: {
      value(jid) {
        if (!jid || typeof jid !== "string") return jid || null;
        return _decode(jid);
      },
    },

    sendStatusMentions: {
      async value(content, jids = []) {
        if (!this.user?.id) {
          throw new Error("User not authenticated");
        }

        const STORIES_JID = "status@broadcast";

        if (!jids || !Array.isArray(jids) || jids.length === 0) {
          throw new Error("JIDs array is required and must not be empty");
        }

        if (jids.length > 5) {
          throw new Error("Maximum 5 mentions per status allowed");
        }

        const userJid = jidNormalizedUser(this.user.id);
        let allUsers = new Set();
        allUsers.add(userJid);

        for (const id of jids) {
          if (isJidGroup(id)) {
            try {
              const metadata = await this.groupMetadata(id);
              const participants = metadata.participants.map((p) =>
                jidNormalizedUser(p.id),
              );
              participants.forEach((jid) => allUsers.add(jid));
            } catch (e) {
              this.logger.error(e);
            }
          } else if (isPnUser(id)) {
            allUsers.add(jidNormalizedUser(id));
          }
        }

        const uniqueUsers = Array.from(allUsers);
        const getRandomHexColor = () =>
          "#" +
          Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, "0");

        const isMedia = content.image || content.video || content.audio;
        const isAudio = !!content.audio;

        const messageContent = { ...content };

        if (isMedia && !isAudio) {
          if (messageContent.text) {
            messageContent.caption = messageContent.text;
            delete messageContent.text;
          }

          delete messageContent.ptt;
          delete messageContent.font;
          delete messageContent.backgroundColor;
          delete messageContent.textColor;
        }

        if (isAudio) {
          delete messageContent.text;
          delete messageContent.caption;
          delete messageContent.font;
          delete messageContent.textColor;
        }

        const font = !isMedia
          ? content.font || Math.floor(Math.random() * 9)
          : undefined;
        const textColor = !isMedia
          ? content.textColor || getRandomHexColor()
          : undefined;
        const backgroundColor =
          !isMedia || isAudio
            ? content.backgroundColor || getRandomHexColor()
            : undefined;
        const ptt = isAudio
          ? typeof content.ptt === "boolean"
            ? content.ptt
            : true
          : undefined;

        let msg;
        try {
          msg = await generateWAMessage(STORIES_JID, messageContent, {
            userJid,
            upload: this.waUploadToServer,
            font,
            textColor,
            backgroundColor,
            ptt,
            getUrlInfo: (text) => {
              return undefined;
            },
          });
        } catch (e) {
          this.logger.error(e);
          throw e;
        }

        await this.relayMessage(STORIES_JID, msg.message, {
          messageId: msg.key.id,
          statusJidList: uniqueUsers,
          additionalNodes: [
            {
              tag: "meta",
              attrs: {},
              content: [
                {
                  tag: "mentioned_users",
                  attrs: {},
                  content: jids.map((jid) => ({
                    tag: "to",
                    attrs: {
                      jid: jidNormalizedUser(jid),
                    },
                  })),
                },
              ],
            },
          ],
        });

        for (const id of jids) {
          try {
            const normalizedId = jidNormalizedUser(id);
            const isPrivate = isPnUser(normalizedId);
            const type = isPrivate
              ? "statusMentionMessage"
              : "groupStatusMentionMessage";

            const messageSecret = new Uint8Array(32);
            crypto.getRandomValues(messageSecret);

            const protocolMessage = {
              [type]: {
                message: {
                  protocolMessage: {
                    key: msg.key,
                    type: 25,
                  },
                },
              },
              messageContextInfo: {
                messageSecret: Buffer.from(messageSecret),
              },
            };

            const statusMsg = await generateWAMessageFromContent(
              normalizedId,
              protocolMessage,
              {
                userJid: this.user.id,
              },
            );

            await this.relayMessage(normalizedId, statusMsg.message, {
              additionalNodes: [
                {
                  tag: "meta",
                  attrs: isPrivate
                    ? { is_status_mention: "true" }
                    : { is_group_status_mention: "true" },
                },
              ],
            });

            await new Promise((r) => setTimeout(r, 2000));
          } catch (e) {
            this.logger.error(e);
          }
        }

        return msg;
      },
      enumerable: true,
    },
    sendAlbum: {
      async value(jid, content, options = {}) {
        if (!this.user?.id) {
          throw new Error("User not authenticated");
        }

        if (
          !content?.album ||
          !Array.isArray(content.album) ||
          content.album.length === 0
        ) {
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
            messageSecret: Buffer.from(messageSecret),
          },
        };

        const generationOptions = {
          userJid: this.user.id,
          upload: this.waUploadToServer,
          quoted: options?.quoted || null,
          ephemeralExpiration: options?.quoted?.expiration ?? 0,
        };

        const album = generateWAMessageFromContent(
          jid,
          messageContent,
          generationOptions,
        );

        await this.relayMessage(album.key.remoteJid, album.message, {
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
            if (Buffer.isBuffer(contentItem.image)) {
              mediaInput.image = contentItem.image;
            } else if (
              typeof contentItem.image === "object" &&
              contentItem.image.url
            ) {
              mediaInput.image = {
                url: contentItem.image.url,
              };
            } else if (typeof contentItem.image === "string") {
              mediaInput.image = {
                url: contentItem.image,
              };
            }

            if (contentItem.caption) {
              mediaInput.caption = contentItem.caption;
            }

            mediaMsg = await generateWAMessage(
              album.key.remoteJid,
              mediaInput,
              {
                upload: this.waUploadToServer,
                ephemeralExpiration: options?.quoted?.expiration ?? 0,
              },
            );
          } else if (contentItem.video) {
            const mediaInput = {};
            if (Buffer.isBuffer(contentItem.video)) {
              mediaInput.video = contentItem.video;
            } else if (
              typeof contentItem.video === "object" &&
              contentItem.video.url
            ) {
              mediaInput.video = {
                url: contentItem.video.url,
              };
            } else if (typeof contentItem.video === "string") {
              mediaInput.video = {
                url: contentItem.video,
              };
            }

            if (contentItem.caption) {
              mediaInput.caption = contentItem.caption;
            }

            if (contentItem.mimetype) {
              mediaInput.mimetype = contentItem.mimetype;
            }

            mediaMsg = await generateWAMessage(
              album.key.remoteJid,
              mediaInput,
              {
                upload: this.waUploadToServer,
                ephemeralExpiration: options?.quoted?.expiration ?? 0,
              },
            );
          } else {
            throw new Error(
              `Item at index ${i} must contain either image or video`,
            );
          }

          mediaMsg.message.messageContextInfo = {
            messageSecret: Buffer.from(mediaSecret),
            messageAssociation: {
              associationType: 1,
              parentMessageKey: album.key,
            },
          };

          mediaMessages.push(mediaMsg);

          await this.relayMessage(mediaMsg.key.remoteJid, mediaMsg.message, {
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
      },
      enumerable: true,
    },
    sendGroupStatus: {
      async value(jid, content = {}, options = {}) {
        if (!this.user?.id) {
          throw new Error("User not authenticated");
        }

        const { backgroundColor, ...contentWithoutBg } = content;

        const inside = await generateWAMessageContent(contentWithoutBg, {
          upload: this.waUploadToServer,
          backgroundColor: backgroundColor || undefined,
        });

        const messageSecret = new Uint8Array(32);
        crypto.getRandomValues(messageSecret);

        const msg = generateWAMessageFromContent(
          jid,
          {
            messageContextInfo: {
              messageSecret,
            },
            groupStatusMessageV2: {
              message: {
                ...inside,
                messageContextInfo: {
                  messageSecret,
                },
              },
            },
          },
          {
            userJid: this.user.id,
            quoted: options?.quoted || null,
          },
        );

        await this.relayMessage(jid, msg.message, {
          messageId: msg.key.id,
        });

        return msg;
      },
      enumerable: true,
    },
    sendInviteGroup: {
      async value(jid, content, options = {}) {
        if (!this.user?.id) {
          throw new Error("User not authenticated");
        }

        if (!content?.groupInvite) {
          throw new Error("Group invite content is required");
        }

        const { groupInvite } = content;

        if (!groupInvite.jid || !groupInvite.code) {
          throw new Error("Group JID and invite code are required");
        }

        let inviteExpiration;
        if (groupInvite.expiration) {
          const expirationNum = parseInt(groupInvite.expiration);
          inviteExpiration = Math.floor(Date.now() / 1000) + expirationNum;
        } else {
          inviteExpiration = Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60;
        }

        let jpegThumbnail = null;

        if (
          groupInvite.jpegThumbnail &&
          Buffer.isBuffer(groupInvite.jpegThumbnail)
        ) {
          jpegThumbnail = groupInvite.jpegThumbnail;
        } else if (groupInvite.thumbnail) {
          if (typeof groupInvite.thumbnail === "string") {
            jpegThumbnail = Buffer.from(groupInvite.thumbnail, "base64");
          } else if (groupInvite.thumbnail.url) {
            try {
              const response = await fetch(groupInvite.thumbnail.url);
              const arrayBuffer = await response.arrayBuffer();
              jpegThumbnail = Buffer.from(arrayBuffer);
            } catch (error) {
              global.logger.error("Failed to fetch thumbnail from URL:", error);
            }
          } else if (Buffer.isBuffer(groupInvite.thumbnail)) {
            jpegThumbnail = groupInvite.thumbnail;
          }
        }

        const msg = proto.Message.create({
          groupInviteMessage: {
            inviteCode: groupInvite.code,
            inviteExpiration: inviteExpiration,
            groupJid: groupInvite.jid,
            groupName: groupInvite.name || "Unknown Group",
            jpegThumbnail: jpegThumbnail,
            caption:
              groupInvite.caption || "Invitation to join my WhatsApp group",
            contextInfo: {
              ...(groupInvite.contextInfo || {}),
              mentionedJid: groupInvite.mentions || options.mentions || [],
            },
          },
        });

        const message = generateWAMessageFromContent(jid, msg, {
          userJid: this.user.id,
          ...options,
        });

        return await this.relayMessage(jid, message.message, {
          messageId: message.key.id,
        });
      },
      enumerable: true,
    },
    sendInviteAdmin: {
      async value(jid, content, options = {}) {
        if (!this.user?.id) {
          throw new Error("User not authenticated");
        }

        if (!content?.adminInvite) {
          throw new Error("Admin invite content is required");
        }

        const { adminInvite } = content;

        if (!adminInvite.jid) {
          throw new Error("Newsletter JID is required");
        }

        let inviteExpiration;
        if (adminInvite.expiration) {
          const expirationNum = parseInt(adminInvite.expiration);
          inviteExpiration = Math.floor(Date.now() / 1000) + expirationNum;
        } else {
          inviteExpiration = Math.floor(Date.now() / 1000) + 86400;
        }

        let jpegThumbnail = null;

        if (
          adminInvite.jpegThumbnail &&
          Buffer.isBuffer(adminInvite.jpegThumbnail)
        ) {
          jpegThumbnail = adminInvite.jpegThumbnail;
        } else if (adminInvite.thumbnail) {
          if (typeof adminInvite.thumbnail === "string") {
            jpegThumbnail = Buffer.from(adminInvite.thumbnail, "base64");
          } else if (adminInvite.thumbnail.url) {
            try {
              const response = await fetch(adminInvite.thumbnail.url);
              const arrayBuffer = await response.arrayBuffer();
              jpegThumbnail = Buffer.from(arrayBuffer);
            } catch (error) {
              global.logger.error("Failed to fetch thumbnail from URL:", error);
            }
          } else if (Buffer.isBuffer(adminInvite.thumbnail)) {
            jpegThumbnail = adminInvite.thumbnail;
          }
        }

        let contextInfo = adminInvite.contextInfo || {};
        if (adminInvite.mentions && adminInvite.mentions.length > 0) {
          contextInfo.mentionedJid = adminInvite.mentions;
        }

        const msg = proto.Message.create({
          newsletterAdminInviteMessage: {
            newsletterJid: adminInvite.jid,
            newsletterName: adminInvite.name || "Newsletter",
            caption: adminInvite.caption || "",
            inviteExpiration: inviteExpiration,
            jpegThumbnail: jpegThumbnail,
            contextInfo:
              Object.keys(contextInfo).length > 0 ? contextInfo : undefined,
          },
        });

        const message = generateWAMessageFromContent(jid, msg, {
          userJid: this.user.id,
          ...options,
        });

        return await this.relayMessage(jid, message.message, {
          messageId: message.key.id,
        });
      },
      enumerable: true,
    },
    pollResult: {
      async value(jid, content, options = {}) {
        if (!this.user?.id) {
          throw new Error("User not authenticated");
        }

        if (!content?.pollResult) {
          throw new Error("Poll result content is required");
        }

        const { pollResult } = content;

        if (!pollResult.name) {
          throw new Error("Poll result name is required");
        }

        if (!Array.isArray(pollResult.values)) {
          throw new Error("Poll result values must be an array");
        }

        for (const [index, value] of pollResult.values.entries()) {
          if (!Array.isArray(value) || value.length !== 2) {
            throw new Error(
              `Poll result value at index ${index} must be an array with [optionName, optionVoteCount]`,
            );
          }

          const [optionName, optionVoteCount] = value;

          if (typeof optionName !== "string") {
            throw new Error(`Option name at index ${index} must be a string`);
          }

          if (typeof optionVoteCount !== "number") {
            throw new Error(
              `Option vote count at index ${index} must be a number`,
            );
          }
        }

        const pollResultSnapshotMessage = {
          name: pollResult.name,
          pollVotes: pollResult.values.map(([optionName, optionVoteCount]) => ({
            optionName,
            optionVoteCount,
          })),
        };

        let contextInfo = {};
        if (pollResult.mentions && pollResult.mentions.length > 0) {
          contextInfo.mentionedJid = pollResult.mentions;
        }
        if (pollResult.contextInfo) {
          contextInfo = {
            ...contextInfo,
            ...pollResult.contextInfo,
          };
        }

        const msg = proto.Message.create({
          pollResultSnapshotMessage: {
            ...pollResultSnapshotMessage,
            ...(Object.keys(contextInfo).length > 0 ? { contextInfo } : {}),
          },
        });

        const message = generateWAMessageFromContent(jid, msg, {
          userJid: this.user.id,
          ...options,
        });

        return await this.relayMessage(jid, message.message, {
          messageId: message.key.id,
        });
      },
      enumerable: true,
    },
    sendPayment: {
      async value(
        jid,
        amount,
        currency = "IDR",
        note = "Payment Request",
        options = {},
      ) {
        if (!this.user?.id) {
          throw new Error("User not authenticated");
        }

        const requestPaymentMessage = {
          amount: {
            currencyCode: currency,
            offset: options.offset || 0,
            value: amount,
          },
          expiryTimestamp: options.expiry || 0,
          amount1000: amount * 1000,
          currencyCodeIso4217: currency,
          requestFrom: options.from || "0@s.whatsapp.net",
          noteMessage: {
            extendedTextMessage: {
              text: note,
              contextInfo: {
                ...(options.contextInfo || {}),
                ...(options.mentions
                  ? {
                      mentionedJid: options.mentions,
                    }
                  : {}),
              },
            },
          },
          background: {
            placeholderArgb: options.image?.placeholderArgb || 4278190080,
            textArgb: options.image?.textArgb || 4294967295,
            subtextArgb: options.image?.subtextArgb || 4294967295,
            type: 1,
          },
        };

        const msg = proto.Message.create({
          requestPaymentMessage,
        });

        const message = generateWAMessageFromContent(jid, msg, {
          userJid: this.user.id,
          ...options,
        });

        return await this.relayMessage(message.key.remoteJid, message.message, {
          messageId: message.key.id,
        });
      },
      enumerable: true,
    },
    sendOrder: {
      async value(jid, orderData, options = {}) {
        if (!this.user?.id) {
          throw new Error("User not authenticated");
        }

        let thumbnail = null;
        if (orderData.thumbnail) {
          if (Buffer.isBuffer(orderData.thumbnail)) {
            thumbnail = orderData.thumbnail;
          } else if (typeof orderData.thumbnail === "string") {
            try {
              if (orderData.thumbnail.startsWith("http")) {
                const response = await fetch(orderData.thumbnail);
                const arrayBuffer = await response.arrayBuffer();
                thumbnail = Buffer.from(arrayBuffer);
              } else {
                thumbnail = Buffer.from(orderData.thumbnail, "base64");
              }
            } catch (e) {
              global.logger?.warn(
                { err: e.message },
                "Failed to fetch/convert thumbnail",
              );
              thumbnail = null;
            }
          }
        }

        const orderMessage = proto.Message.OrderMessage.fromObject({
          orderId: orderData.orderId || generateMessageID(),
          thumbnail: thumbnail,
          itemCount: orderData.itemCount || 1,
          status:
            orderData.status || proto.Message.OrderMessage.OrderStatus.INQUIRY,
          surface:
            orderData.surface ||
            proto.Message.OrderMessage.OrderSurface.CATALOG,
          message: orderData.message || "",
          orderTitle: orderData.orderTitle || "Order",
          sellerJid: orderData.sellerJid || this.user.id,
          token: orderData.token || "",
          totalAmount1000: orderData.totalAmount1000 || 0,
          totalCurrencyCode: orderData.totalCurrencyCode || "IDR",
          contextInfo: {
            ...(options.contextInfo || {}),
            ...(options.mentions
              ? {
                  mentionedJid: options.mentions,
                }
              : {}),
          },
        });

        const msg = proto.Message.create({
          orderMessage,
        });

        const message = generateWAMessageFromContent(jid, msg, {
          userJid: this.user.id,
          timestamp: options.timestamp || new Date(),
          quoted: options.quoted || null,
          ephemeralExpiration: options.ephemeralExpiration || 0,
          messageId: options.messageId || null,
        });

        return await this.relayMessage(message.key.remoteJid, message.message, {
          messageId: message.key.id,
        });
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
              throw new Error(
                "Media must be Buffer, URL string, or { url: string }",
              );
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
              cardObj.nativeFlowMessage = {
                buttons: card.buttons.map((btn) => ({
                  name: btn.name || "quick_reply",
                  buttonParamsJson: btn.buttonParamsJson || JSON.stringify(btn),
                })),
              };
            }

            return cardObj;
          }),
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
          },
        );

        await this.relayMessage(jid, msg.message, {
          messageId: msg.key.id,
        });

        return msg;
      },
      enumerable: true,
    },
    sendPayInfo: {
      async value(jid, content = {}, options = {}) {
        if (!this.user?.id) {
          throw new Error("User not authenticated");
        }

        const { text = "", footer = "", interactiveButtons = [] } = content;

        if (
          !Array.isArray(interactiveButtons) ||
          interactiveButtons.length === 0
        ) {
          throw new Error("interactiveButtons must be a non-empty array");
        }

        const firstButtonName = interactiveButtons[0]?.name;

        if (
          firstButtonName !== "payment_info" &&
          firstButtonName !== "review_and_pay"
        ) {
          throw new Error(
            "First interactive button must be either 'payment_info' or 'review_and_pay'",
          );
        }

        const processedButtons = [];

        for (let i = 0; i < interactiveButtons.length; i++) {
          const btn = interactiveButtons[i];

          if (!btn || typeof btn !== "object") {
            throw new Error(`interactiveButton[${i}] must be an object`);
          }

          if (btn.name && btn.buttonParamsJson) {
            try {
              JSON.parse(btn.buttonParamsJson);
            } catch (e) {
              throw new Error(`Invalid JSON in buttonParamsJson: ${e.message}`);
            }

            processedButtons.push({
              name: btn.name,
              buttonParamsJson: btn.buttonParamsJson,
            });
            continue;
          }

          throw new Error(`interactiveButton[${i}] has invalid shape`);
        }

        let messageContent = {};

        if (text !== undefined) {
          messageContent.body = { text: text };
        }

        if (footer) {
          messageContent.footer = { text: footer };
        }

        messageContent.nativeFlowMessage = {
          buttons: processedButtons,
        };

        const additionalNodes = [
          {
            tag: "biz",
            attrs: {
              native_flow_name:
                firstButtonName === "review_and_pay"
                  ? "order_details"
                  : firstButtonName,
            },
          },
        ];

        const payload = proto.Message.InteractiveMessage.create(messageContent);

        const msg = generateWAMessageFromContent(
          jid,
          {
            interactiveMessage: payload,
          },
          {
            userJid: this.user.id,
            quoted: options?.quoted || null,
          },
        );

        await this.relayMessage(jid, msg.message, {
          messageId: msg.key.id,
          additionalNodes,
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

        if (
          !Array.isArray(interactiveButtons) ||
          interactiveButtons.length === 0
        ) {
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
            upload: this.waUploadToServer,
          });

          messageContent.header = {
            title: title || "",
            hasMediaAttachment: hasMediaAttachment || true,
            videoMessage: preparedMedia.videoMessage,
          };
        } else if (document) {
          const mediaInput = { document: {} };

          if (Buffer.isBuffer(document)) {
            mediaInput.document = document;
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
                const response = await fetch(jpegThumbnail);
                const arrayBuffer = await response.arrayBuffer();
                if (typeof mediaInput.document === "object") {
                  mediaInput.document.jpegThumbnail = Buffer.from(arrayBuffer);
                }
              } catch {
                //
              }
            }
          }

          const preparedMedia = await prepareWAMessageMedia(mediaInput, {
            upload: this.waUploadToServer,
          });

          if (preparedMedia.documentMessage) {
            if (fileName) preparedMedia.documentMessage.fileName = fileName;
            if (fileLength !== null)
              preparedMedia.documentMessage.fileLength = fileLength.toString();
            if (pageCount !== null)
              preparedMedia.documentMessage.pageCount = pageCount;
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
              thumbnailUrl:
                externalAdReply.thumbnailUrl || externalAdReply.thumbnail || "",
              renderLargerThumbnail:
                externalAdReply.renderLargerThumbnail || false,
              showAdAttribution: externalAdReply.showAdAttribution !== false,
              containsAutoReply: externalAdReply.containsAutoReply || false,
              ...(externalAdReply.mediaUrl && {
                mediaUrl: externalAdReply.mediaUrl,
              }),
              ...(externalAdReply.thumbnail &&
                Buffer.isBuffer(externalAdReply.thumbnail) && {
                  thumbnail: externalAdReply.thumbnail,
                }),
              ...(externalAdReply.jpegThumbnail && {
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
            userJid: this.user.id,
            quoted: options?.quoted || null,
          },
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
        let ephemeral = false;
        try {
          const chat = await conn.getChat(jid);
          ephemeral =
            chat?.metadata?.ephemeralDuration ||
            chat?.ephemeralDuration ||
            false;
        } catch (e) {
          global.logger?.error({ error: e.message, jid }, "getChat error");
        }

        text = _isStr(text) ? text.trim() : String(text || "");

        const isGroup = jid.endsWith("@g.us");
        const baseOptions = {
          quoted,
          ephemeralExpiration: ephemeral,
        };

        const messageContent = { text, ...options };

        if (isGroup) {
          return conn.sendMessage(jid, messageContent, baseOptions);
        }

        const msg = generateWAMessageFromContent(
          jid,
          { extendedTextMessage: messageContent },
          {
            userJid: conn.user.lid,
            quoted: quoted || null,
          },
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
        if (!jid || withoutContact) return jid || "";

        if (_isGroupJid(jid)) {
          try {
            const chat = await conn.getChat(jid);
            if (chat?.subject) return chat.subject;

            const md = await conn.groupMetadata(jid);
            if (md?.subject) {
              conn
                .setChat(jid, {
                  ...(chat || { id: jid }),
                  subject: md.subject,
                  metadata: md,
                })
                .catch(() => {});
              return md.subject;
            }
          } catch {
            return jid;
          }
        }

        const self =
          conn.user?.lid && areJidsSameUser
            ? areJidsSameUser(jid, conn.user.lid)
            : false;

        if (self) return conn.user?.name || jid;

        try {
          const chat = await conn.getChat(jid);
          return chat?.name || chat?.notify || jid;
        } catch {
          return jid;
        }
      },
      enumerable: true,
    },

    loadMessage: {
      async value(messageID) {
        if (!messageID) return null;

        try {
          const allChats = await conn.getAllChats();
          for (const chatData of allChats) {
            const msg = chatData?.messages?.[messageID];
            if (msg) return msg;
          }
        } catch (e) {
          global.logger?.error({ error: e.message }, "loadMessage error");
        }

        return null;
      },
      enumerable: true,
    },

    processMessageStubType: {
      async value(m) {
        if (!m?.messageStubType) return;

        const chat = conn.decodeJid(
          m.key?.remoteJid ||
            m.message?.senderKeyDistributionMessage?.groupId ||
            "",
        );

        if (!chat || _isStatusJid(chat)) return;

        const name =
          Object.entries(WAMessageStubType).find(
            ([, v]) => v === m.messageStubType,
          )?.[0] || "UNKNOWN";

        const author = conn.decodeJid(
          m.key?.participant || m.participant || m.key?.remoteJid || "",
        );

        global.logger?.warn({
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
          const allGroups = await conn
            .groupFetchAllParticipating()
            .catch(() => ({}));

          if (!allGroups || typeof allGroups !== "object") {
            return {};
          }

          const groupEntries = Object.entries(allGroups);
          const batchSize = 10;

          for (let i = 0; i < groupEntries.length; i += batchSize) {
            const batch = groupEntries.slice(i, i + batchSize);

            await Promise.all(
              batch.map(async ([gid, meta]) => {
                if (!_isGroupJid(gid)) return;

                const chat = {
                  id: gid,
                  subject: meta.subject || "",
                  metadata: meta,
                  isChats: true,
                  lastSync: Date.now(),
                };

                await conn.setChat(gid, chat);
              }),
            );
          }

          return allGroups;
        } catch (e) {
          global.logger?.error(e);
          return {};
        }
      },
      enumerable: true,
    },

    pushMessage: {
      async value(m) {
        if (!m) return;

        const messages = Array.isArray(m) ? m : [m];

        messages.forEach((message) => {
          asyncPipeline.add(async () => {
            try {
              if (
                message.messageStubType &&
                message.messageStubType !== WAMessageStubType.CIPHERTEXT
              ) {
                await conn.processMessageStubType(message);
              }

              const msgObj = message.message || {};
              const mtypeKeys = Object.keys(msgObj);
              if (!mtypeKeys.length) return;

              let mtype = mtypeKeys.find(
                (k) =>
                  k !== "senderKeyDistributionMessage" &&
                  k !== "messageContextInfo",
              );
              if (!mtype) mtype = mtypeKeys[mtypeKeys.length - 1];

              const chat = conn.decodeJid(
                message.key?.remoteJid ||
                  msgObj?.senderKeyDistributionMessage?.groupId ||
                  "",
              );

              if (!chat || _isStatusJid(chat)) return;

              let chatData = await conn.getChat(chat);
              if (!chatData) {
                chatData = { id: chat, isChats: true };
              }

              const isGroup = _isGroupJid(chat);

              if (isGroup && !chatData.metadata) {
                try {
                  const md = await conn.groupMetadata(chat);
                  chatData.subject = md.subject;
                  chatData.metadata = md;
                } catch (e) {
                  //
                }
              }

              const ctx = msgObj[mtype]?.contextInfo;
              if (ctx?.quotedMessage && ctx.stanzaId) {
                const qChat = conn.decodeJid(
                  ctx.remoteJid || ctx.participant || chat,
                );

                if (qChat && !_isStatusJid(qChat)) {
                  try {
                    let qm = await conn.getChat(qChat);
                    if (!qm) {
                      qm = {
                        id: qChat,
                        isChats: !_isGroupJid(qChat),
                      };
                    }

                    qm.messages ||= {};

                    if (!qm.messages[ctx.stanzaId]) {
                      const quotedMsg = {
                        key: {
                          remoteJid: qChat,
                          fromMe:
                            conn.user?.lid && areJidsSameUser
                              ? areJidsSameUser(conn.user.lid, qChat)
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

                      qm.messages[ctx.stanzaId] = quotedMsg;

                      const msgKeys = Object.keys(qm.messages);
                      if (msgKeys.length > 30) {
                        for (let i = 0; i < msgKeys.length - 20; i++) {
                          delete qm.messages[msgKeys[i]];
                        }
                      }

                      await conn.setChat(qChat, qm);
                    }
                  } catch (e) {
                    //
                  }
                }
              }

              if (!isGroup) {
                const sender =
                  message.key?.fromMe && conn.user?.lid ? conn.user.lid : chat;
                chatData.name = message.pushName || chatData.name || "";
              } else {
                const sender = conn.decodeJid(
                  (message.key?.fromMe && conn.user?.lid) ||
                    message.participant ||
                    message.key?.participant ||
                    chat,
                );

                if (sender && sender !== chat) {
                  try {
                    const sChat = (await conn.getChat(sender)) || {
                      id: sender,
                    };
                    sChat.name = message.pushName || sChat.name || "";
                    await conn.setChat(sender, sChat);
                  } catch (e) {
                    //
                  }
                }
              }

              if (mtype !== "senderKeyDistributionMessage") {
                const sender = isGroup
                  ? conn.decodeJid(
                      (message.key?.fromMe && conn.user?.lid) ||
                        message.participant ||
                        message.key?.participant ||
                        chat,
                    )
                  : message.key?.fromMe && conn.user?.lid
                    ? conn.user.lid
                    : chat;

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
                  const cleanMsg = { ...message };
                  if (cleanMsg.message) {
                    delete cleanMsg.message.messageContextInfo;
                    delete cleanMsg.message.senderKeyDistributionMessage;
                  }

                  chatData.messages ||= {};
                  chatData.messages[message.key.id] = cleanMsg;

                  const msgKeys = Object.keys(chatData.messages);
                  if (msgKeys.length > 20) {
                    for (let i = 0; i < msgKeys.length - 15; i++) {
                      delete chatData.messages[msgKeys[i]];
                    }
                  }
                }
              }

              await conn.setChat(chat, chatData);
            } catch (e) {
              global.logger?.error({ error: e.message }, "pushMessage error");
            }
          });
        });
      },
      enumerable: true,
    },

    serializeM: {
      value(m) {
        return smsg(conn, m);
      },
    },
  });

  if (conn.user?.lid) {
    conn.user.lid = conn.decodeJid(conn.user.lid);
  }

  return conn;
}
