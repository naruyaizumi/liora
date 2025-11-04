/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import pino from "pino"
import NodeCache from "@cacheable/node-cache"

const logger = pino({
  level: "error",
  base: { module: "STORE" },
  transport: {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "HH:MM", ignore: "pid,hostname" }
  }
})

const MAX_MESSAGES_PER_CHAT = 100
const MESSAGE_CLEANUP_THRESHOLD = 150

function bind(conn) {
  if (!conn.chats) conn.chats = {}

  const metadataCache = new NodeCache({ ttl: 300, checkperiod: 60 })
  const metadataLocks = new Map()

  function safeDecodeJid(jid) {
    try {
      const decoded = conn.decodeJid(jid)
      if (!decoded || decoded === "status@broadcast") return null
      return decoded
    } catch {
      return null
    }
  }

  async function getCachedGroupMetadata(id) {
    if (!id) return null
    const cached = metadataCache.get(id)
    if (cached) return cached

    if (metadataLocks.has(id)) return metadataLocks.get(id)
    const fetchPromise = (async () => {
      try {
        const metadata = await conn.groupMetadata(id)
        if (metadata) metadataCache.set(id, metadata)
        return metadata
      } catch (e) {
        logger.error(`Failed to fetch metadata for ${id}: ${e.message}`)
        return null
      } finally {
        metadataLocks.delete(id)
      }
    })()
    metadataLocks.set(id, fetchPromise)
    return fetchPromise
  }

  function cleanupMessages(chatData) {
    if (!chatData?.messages) return
    const keys = Object.keys(chatData.messages)
    if (keys.length <= MESSAGE_CLEANUP_THRESHOLD) return

    const sorted = keys
      .map(k => ({ key: k, ts: chatData.messages[k]?.messageTimestamp || 0 }))
      .sort((a, b) => b.ts - a.ts)
      .slice(0, MAX_MESSAGES_PER_CHAT)

    chatData.messages = sorted.reduce((acc, { key }) => {
      acc[key] = chatData.messages[key]
      return acc
    }, {})
  }

  function updateContacts(contacts) {
    if (!contacts) return
    try {
      const list = contacts.contacts || contacts
      if (!Array.isArray(list)) return

      for (const c of list) {
        if (!c?.id) continue
        const id = safeDecodeJid(c.id)
        if (!id) continue
        const isGroup = id.endsWith("@g.us")
        if (!conn.chats[id]) conn.chats[id] = { id }
        const existing = conn.chats[id]
        conn.chats[id] = isGroup
          ? { ...existing, ...c, id, subject: c.subject || c.name || existing.subject || "" }
          : { ...existing, ...c, id, name: c.notify || c.name || existing.name || "" }
      }
    } catch (e) {
      logger.error(e.message)
    }
  }

  function upsertChats(chats) {
    if (!Array.isArray(chats)) chats = [chats]
    for (const chat of chats) {
      if (!chat?.id) continue
      const id = safeDecodeJid(chat.id)
      if (!id) continue
      conn.chats[id] = { ...(conn.chats[id] || {}), ...chat, isChats: true }
    }
  }

  function handleMessagesUpsert(messages) {
    if (!Array.isArray(messages)) messages = [messages]
    for (const msg of messages) {
      const jid = safeDecodeJid(msg?.key?.remoteJid)
      if (!jid) continue
      if (!conn.chats[jid]) conn.chats[jid] = { id: jid }
      const chatData = conn.chats[jid]
      if (!chatData.messages) chatData.messages = {}
      chatData.messages[msg.key.id] = { ...(chatData.messages[msg.key.id] || {}), ...msg }
      cleanupMessages(chatData)
    }
  }

  function handleMessagesUpdate(updates) {
    if (!Array.isArray(updates)) updates = [updates]
    for (const { key, update } of updates) {
      const jid = safeDecodeJid(key?.remoteJid)
      if (!jid || !conn.chats[jid]?.messages) continue
      conn.chats[jid].messages[key.id] = { ...(conn.chats[jid].messages[key.id] || {}), ...update }
    }
  }

  conn.ev.on("contacts.upsert", updateContacts)
  conn.ev.on("contacts.set", updateContacts)
  conn.ev.on("chats.set", async ({ chats }) => {
    try {
      upsertChats(chats)
      for (const chat of chats) {
        const id = safeDecodeJid(chat.id)
        if (!id || !id.endsWith("@g.us")) continue
        if (!conn.chats[id]) conn.chats[id] = { id }
        const chatData = conn.chats[id]
        const metadata = await getCachedGroupMetadata(id)
        if (metadata) chatData.metadata = metadata
        chatData.subject = chatData.subject || metadata?.subject || ""
      }
    } catch (e) {
      logger.error(e.message)
    }
  })
  conn.ev.on("chats.upsert", upsertChats)
  conn.ev.on("presence.update", ({ id, presences }) => {
    const sender = Object.keys(presences || {})[0] || id
    const jid = safeDecodeJid(sender)
    if (!jid) return
    if (!conn.chats[jid]) conn.chats[jid] = { id: jid }
    conn.chats[jid].presences = presences[sender]?.lastKnownPresence || "composing"
  })
  conn.ev.on("group-participants.update", async ({ id }) => {
    const jid = safeDecodeJid(id)
    if (!jid) return
    metadataCache.del(jid)
    const metadata = await getCachedGroupMetadata(jid)
    if (!conn.chats[jid]) conn.chats[jid] = { id: jid }
    conn.chats[jid].metadata = metadata
    conn.chats[jid].subject = metadata?.subject || conn.chats[jid].subject
  })
  conn.ev.on("groups.update", async updates => {
    if (!Array.isArray(updates)) updates = [updates]
    for (const update of updates) {
      const jid = safeDecodeJid(update?.id)
      if (!jid) continue
      metadataCache.del(jid)
      const metadata = await getCachedGroupMetadata(jid)
      if (!conn.chats[jid]) conn.chats[jid] = { id: jid }
      conn.chats[jid].metadata = metadata
      conn.chats[jid].subject = update.subject || metadata?.subject || conn.chats[jid].subject
    }
  })
  conn.ev.on("messages.upsert", ({ messages }) => handleMessagesUpsert(messages))
  conn.ev.on("messages.update", updates => handleMessagesUpdate(updates))
}

export default { bind }