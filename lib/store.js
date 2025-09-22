/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
function bind(conn) {
    if (!conn.chats) conn.chats = {};

    function updateNameToDb(contacts) {
        if (!contacts) return;
        try {
            contacts = contacts.contacts || contacts;
            for (const contact of contacts) {
                const id = conn.decodeJid(contact.id);
                if (!id || id === "status@broadcast") continue;
                let chats = conn.chats[id];
                if (!chats) chats = conn.chats[id] = { ...contact, id };
                conn.chats[id] = {
                    ...chats,
                    ...contact,
                    id,
                    ...(id.endsWith("@g.us")
                        ? { subject: contact.subject || contact.name || chats.subject || "" }
                        : {
                              name:
                                  contact.notify ||
                                  contact.name ||
                                  chats.name ||
                                  chats.notify ||
                                  "",
                          }),
                };
            }
        } catch (e) {
            console.error(e);
        }
    }
    conn.ev.on("contacts.upsert", updateNameToDb);
    conn.ev.on("groups.update", updateNameToDb);
    conn.ev.on("contacts.set", updateNameToDb);
    conn.ev.on("chats.set", async ({ chats }) => {
        try {
            for (let { id, name, readOnly } of chats) {
                id = conn.decodeJid(id);
                if (!id || id === "status@broadcast") continue;
                const isGroup = id.endsWith("@g.us");
                let chatData = conn.chats[id];
                if (!chatData) chatData = conn.chats[id] = { id };
                chatData.isChats = !readOnly;
                if (name) chatData[isGroup ? "subject" : "name"] = name;
                if (isGroup) {
                    const metadata = await conn.groupMetadata(id).catch(() => null);
                    if (name || metadata?.subject) chatData.subject = name || metadata.subject;
                    if (!metadata) continue;
                    chatData.metadata = metadata;
                }
            }
        } catch (e) {
            console.error(e);
        }
    });
    conn.ev.on("group-participants.update", async function updateParticipantsToDb({ id }) {
        if (!id) return;
        id = conn.decodeJid(id);
        if (id === "status@broadcast") return;
        if (!(id in conn.chats)) conn.chats[id] = { id };
        let chats = conn.chats[id];
        chats.isChats = true;
        const groupMetadata = await conn.groupMetadata(id).catch(() => null);
        if (!groupMetadata) return;
        chats.subject = groupMetadata.subject;
        chats.metadata = groupMetadata;
    });
    conn.ev.on("groups.update", async function groupUpdatePushToDb(groupsUpdates) {
        try {
            for (const update of groupsUpdates) {
                const id = conn.decodeJid(update.id);
                if (!id || id === "status@broadcast") continue;
                if (!id.endsWith("@g.us")) continue;
                let chats = conn.chats[id];
                if (!chats) chats = conn.chats[id] = { id };
                chats.isChats = true;
                const metadata = await conn.groupMetadata(id).catch(() => null);
                if (metadata) chats.metadata = metadata;
                if (update.subject || metadata?.subject)
                    chats.subject = update.subject || metadata.subject;
            }
        } catch (e) {
            console.error(e);
        }
    });
    conn.ev.on("chats.upsert", function chatsUpsertPushToDb(chatsUpsert) {
        try {
            const { id } = chatsUpsert;
            if (!id || id === "status@broadcast") return;
            conn.chats[id] = { ...(conn.chats[id] || {}), ...chatsUpsert, isChats: true };
            if (id.endsWith("@g.us")) conn.insertAllGroup().catch(() => null);
        } catch (e) {
            console.error(e);
        }
    });
    conn.ev.on("presence.update", async function presenceUpdatePushToDb({ id, presences }) {
        try {
            const sender = Object.keys(presences)[0] || id;
            const _sender = conn.decodeJid(sender);
            const presence = presences[sender]?.lastKnownPresence || "composing";
            let chats = conn.chats[_sender];
            if (!chats) chats = conn.chats[_sender] = { id: sender };
            chats.presences = presence;
            if (id.endsWith("@g.us")) {
                let groupChats = conn.chats[id];
                if (!groupChats) conn.chats[id] = { id };
            }
        } catch (e) {
            console.error(e);
        }
    });
}

export default { bind };
