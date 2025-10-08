let handler = async (m, { conn, args, usedPrefix, command }) => {
    const timestamp = new Date().toTimeString().split(" ")[0];
    const arg = (args[0] || "").toLowerCase();
    const isClose = { open: "not_announcement", close: "announcement" }[arg];

    if (isClose === undefined) {
        return m.reply(
            [
                "```",
                `┌─[${timestamp}]────────────`,
                `│  GROUP SETTINGS`,
                "└──────────────────────",
                `Usage : ${usedPrefix + command} open | close`,
                "───────────────────────",
                "open  → allow members to send messages",
                "close → only admins can send messages",
                "```",
            ].join("\n")
        );
    }

    await conn.groupSettingUpdate(m.chat, isClose);

    const status =
        arg === "open" ? "GROUP OPENED (members can chat)" : "GROUP CLOSED (admins only)";

    return m.reply(
        [
            "```",
            `┌─[${timestamp}]────────────`,
            `│  GROUP SETTINGS`,
            "└──────────────────────",
            `Status : ${status}`,
            "───────────────────────",
            "Group setting updated successfully.",
            "```",
        ].join("\n")
    );
};

handler.help = ["group"];
handler.tags = ["group"];
handler.command = /^(g|group)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
