let handler = async (m, { conn, args, usedPrefix, command }) => {
    let targets = [];
    for (let arg of args) {
        if (/^\d{5,}$/.test(arg)) {
            let jid = arg.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
            targets.push(jid);
        }
    }
    targets = [...new Set(targets)];
    if (!targets.length)
        return m.reply(
            `Enter WhatsApp numbers to add.\n› Example: ${usedPrefix + command} 628xxxx 628xxxx`
        );

    const timestamp = new Date().toTimeString().split(" ")[0];
    let success = [];
    let failed = [];

    for (let target of targets) {
        try {
            await conn.groupParticipantsUpdate(m.chat, [target], "add");
            success.push(target);
        } catch (e) {
            failed.push(target);
            console.error(e);
        }
        await delay(1500);
    }

    const response = [
        "```",
        `┌─[${timestamp}]────────────`,
        `│  GROUP MEMBER ADD`,
        "└──────────────────────",
        `Total Targets : ${targets.length}`,
        `Added         : ${success.length}`,
        `Failed        : ${failed.length}`,
        "───────────────────────",
        success.length
            ? success.map((u) => `+ ${u.replace("@s.whatsapp.net", "")}`).join("\n")
            : "(no successful adds)",
        failed.length
            ? "\n───────────────────────\nFailed:\n" +
              failed.map((u) => `- ${u.replace("@s.whatsapp.net", "")}`).join("\n")
            : "",
        "```",
    ].join("\n");

    await conn.sendMessage(m.chat, { text: response }, { quoted: m });
};

handler.help = ["add"];
handler.tags = ["group"];
handler.command = /^(add)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
