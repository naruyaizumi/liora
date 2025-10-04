let handler = async (m) => {
    try {
        if (!m.quoted) return m.reply("🍩 *Reply pesannya!*")

        let text = safeJson(m.quoted)
        if (text.length > 5000) text = text.slice(0, 5000) + "\n... (terpotong)"
        await m.reply("```" + text + "```")
    } catch (error) {
        console.error(error)
        m.reply("🍬 *Error saat membaca data pesan quoted.*")
    }
}

handler.help = ["debug"]
handler.tags = ["tool"]
handler.command = /^(getq|q|debug)$/i
handler.mods = true

export default handler

function safeJson(obj) {
    const seen = new WeakSet()
    return JSON.stringify(
        obj,
        (key, value) => {
            if (typeof value === "object" && value !== null) {
                if (seen.has(value)) return "[Circular]"
                seen.add(value)
            }
            if (Array.isArray(value) && value.every(v => typeof v === "number")) {
                try {
                    return Buffer.from(value).toString("base64")
                } catch {
                    return `[Array(${value.length})]`
                }
            }
            return value
        },
        2
    )
}