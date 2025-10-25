export async function before(m, { conn }) {
    this.arona = this.arona || {};
    let chatId = m.chat;
    let sender = m.sender;
    let text = m.text?.trim();
    if (m.isBaileys || m.fromMe) return;
    if (
        typeof global.prefix === "function"
            ? global.prefix(m)
            : global.prefix instanceof RegExp
              ? global.prefix.test(text)
              : text?.startsWith(global.prefix)
    )
        return;
    if (m.isGroup) return;
    if (!this.arona[chatId] || !this.arona[chatId].active) return;

    if (!text) return;

    try {
        await this.readMessages([m.key]);
        await this.sendPresenceUpdate("composing", chatId);

        let url = `https://api.nekolabs.web.id/ai/char/arona?text=${encodeURIComponent(text)}&sessionId=${encodeURIComponent(sender)}`;
        let res = await fetch(url);
        let json = await res.json();

        await this.sendPresenceUpdate("paused", chatId);
        if (!json.success || !json.result) return;
        await this.reply(chatId, json.result, m);
    } catch (e) {
        await this.sendPresenceUpdate("paused", chatId);
        conn.logger.error(e);
        await this.reply(
            chatId,
            "Arona is charging her nimbus energy...\nTry calling her again later, Sensei~"
        );
    }
}
