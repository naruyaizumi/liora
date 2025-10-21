import DB from "better-sqlite3";
import path from "path";

let handler = async (m) => {
    const dbPath = path.resolve(process.cwd(), "database/auth.db");
    const db = new DB(dbPath);
    const groups = Object.keys(global.conn.chats || {}).filter((j) => j.endsWith("@g.us"));

    let totalSenderKeys = 0;
    let totalSessions = 0;
    let totalAppState = 0;
    let totalUserSenderKeys = 0;
    let totalMemoryKeys = 0;
    let totalSyncVersions = 0;
    let totalSyncKeyIds = 0;
    let totalSenderKeyIds = 0;
    let totalAccountSync = 0;
    let totalDeviceIds = 0;

    for (const gid of groups) {
        totalSenderKeys += db
            .prepare("DELETE FROM baileys_state WHERE key LIKE ?")
            .run(`sender-key-%${gid}%`).changes;
        totalSessions += db
            .prepare("DELETE FROM baileys_state WHERE key LIKE ?")
            .run(`session-%${gid}%`).changes;
        totalAppState += db
            .prepare("DELETE FROM baileys_state WHERE key LIKE ?")
            .run(`app-state-sync-key-%`).changes;
    }

    totalUserSenderKeys = db
        .prepare("DELETE FROM baileys_state WHERE key LIKE ?")
        .run(`sender-key-%@s.whatsapp.net%`).changes;
    totalMemoryKeys = db
        .prepare("DELETE FROM baileys_state WHERE key LIKE ?")
        .run(`sender-key-memory-%`).changes;
    totalSyncVersions = db
        .prepare("DELETE FROM baileys_state WHERE key LIKE ?")
        .run(`app-state-sync-version-%`).changes;
    totalSyncKeyIds = db
        .prepare("DELETE FROM baileys_state WHERE key LIKE ?")
        .run(`app-state-sync-key-id-%`).changes;
    totalSenderKeyIds = db
        .prepare("DELETE FROM baileys_state WHERE key LIKE ?")
        .run(`sender-key-id-%`).changes;
    totalAccountSync = db
        .prepare("DELETE FROM baileys_state WHERE key LIKE ?")
        .run(`account-sync-%`).changes;
    totalDeviceIds = db
        .prepare("DELETE FROM baileys_state WHERE key LIKE ?")
        .run(`device-id-%`).changes;

    const cap = `
*Baileys State Cleanup Complete*
\`\`\`
• Total Groups: ${groups.length}
• Sender Keys Deleted: ${totalSenderKeys + totalUserSenderKeys}
• Session Keys Deleted: ${totalSessions}
• App State Keys Deleted: ${totalAppState}
• Memory Keys Deleted: ${totalMemoryKeys}
• Sync Versions Deleted: ${totalSyncVersions}
• Sync Key IDs Deleted: ${totalSyncKeyIds}
• Sender Key IDs Deleted: ${totalSenderKeyIds}
• Account Sync Deleted: ${totalAccountSync}
• Device IDs Deleted: ${totalDeviceIds}
\`\`\`
`.trim();

    await m.reply(cap);
};

handler.help = ["fix"];
handler.tags = ["owner"];
handler.command = /^(fix)$/i;
handler.mods = true;

export default handler;
