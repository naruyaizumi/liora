import { getAuthDatabase } from "../../lib/auth/database-core.js";
import { Mutex } from "async-mutex";

const cleanupMutex = new Mutex();

let handler = async (m, { conn }) => {
    const release = await cleanupMutex.acquire();

    try {
        const db = getAuthDatabase();
        if (!db || db.disposed) {
            return m.reply("Database instance is not available or disposed");
        }

        if (!conn || !conn.chats) {
            return m.reply("Connection is not properly initialized");
        }

        const groups = Object.keys(conn.chats).filter((j) => j.endsWith("@g.us"));

        let totalSenderKeys = 0;
        let totalSessions = 0;
        let totalAppState = 0;
        let totalUserSenderKeys = 0;
        let totalMemoryKeys = 0;
        let totalSyncVersions = 0;
        let totalSyncKeyIds = 0;
        let totalSenderKeyIds = 0;
        let totalAccountSync = 0;
        let totalPreKeys = 0;
        let totalSessionMessages = 0;
        let totalMessageRetry = 0;
        let noiseKeys = 0;
        let peerDevice = 0;

        await global.loading(m, conn);
        await db.flush();
        await new Promise((resolve) => setTimeout(resolve, 200));

        db.db.exec("BEGIN IMMEDIATE");

        const deleteStmt = db.db.prepare(
            "DELETE FROM baileys_state WHERE key LIKE ? AND key NOT LIKE 'creds%'"
        );

        for (const gid of groups) {
            totalSenderKeys += deleteStmt.run(`sender-key-%${gid}%`).changes;
            totalSessions += deleteStmt.run(`session-%${gid}%`).changes;
        }

        totalAppState = deleteStmt.run(`app-state-sync-key-%`).changes;
        totalUserSenderKeys = deleteStmt.run(`sender-key-%@s.whatsapp.net%`).changes;
        totalMemoryKeys = deleteStmt.run(`sender-key-memory-%`).changes;
        totalSyncVersions = deleteStmt.run(`app-state-sync-version-%`).changes;
        totalSyncKeyIds = deleteStmt.run(`app-state-sync-key-id-%`).changes;
        totalSenderKeyIds = deleteStmt.run(`sender-key-id-%`).changes;
        totalAccountSync = deleteStmt.run(`account-sync-%`).changes;
        totalSessionMessages = deleteStmt.run(`session-msg-%`).changes;
        totalMessageRetry = deleteStmt.run(`msg-retry-%`).changes;
        noiseKeys = deleteStmt.run(`noise-%`).changes;
        peerDevice = deleteStmt.run(`peer-device-%`).changes;

        const preKeyStmt = db.db.prepare(`
            DELETE FROM baileys_state 
            WHERE key LIKE 'pre-key-%' 
            AND key NOT LIKE 'creds%'
            AND key NOT IN (
                SELECT key FROM baileys_state 
                WHERE key LIKE 'pre-key-%' 
                AND key NOT LIKE 'creds%'
                ORDER BY key DESC 
                LIMIT 50
            )
        `);
        totalPreKeys = preKeyStmt.run().changes;

        deleteStmt.finalize();
        preKeyStmt.finalize();

        db.db.exec("COMMIT");
        db.cache.clear();

        await new Promise((resolve) => setTimeout(resolve, 150));

        const maintenanceResults = {
            checkpoint: false,
            analyze: false,
            vacuum: false,
            optimize: false,
        };

        db.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
        maintenanceResults.checkpoint = true;

        db.db.exec("ANALYZE");
        maintenanceResults.analyze = true;

        db.db.exec("VACUUM");
        maintenanceResults.vacuum = true;

        db.db.exec("PRAGMA optimize");
        maintenanceResults.optimize = true;

        const totalDeleted =
            totalSenderKeys +
            totalUserSenderKeys +
            totalSessions +
            totalAppState +
            totalMemoryKeys +
            totalSyncVersions +
            totalSyncKeyIds +
            totalSenderKeyIds +
            totalAccountSync +
            totalPreKeys +
            totalSessionMessages +
            totalMessageRetry +
            noiseKeys +
            peerDevice;

        const maintenanceStatus = `
Checkpoint: ${maintenanceResults.checkpoint ? "Success" : "Failed"}
Analyze: ${maintenanceResults.analyze ? "Success" : "Failed"}
Vacuum: ${maintenanceResults.vacuum ? "Success" : "Failed"}
Optimize: ${maintenanceResults.optimize ? "Success" : "Failed"}`.trim();

        const cap = `
Session Cleanup Complete

Statistics:
━━━━━━━━━━━━━━━━━━━━
Groups Processed: ${groups.length}
Sender Keys Deleted: ${totalSenderKeys + totalUserSenderKeys}
Session Keys Deleted: ${totalSessions}
App State Keys Deleted: ${totalAppState}
Memory Keys Deleted: ${totalMemoryKeys}
Sync Versions Deleted: ${totalSyncVersions}
Sync Key IDs Deleted: ${totalSyncKeyIds}
Sender Key IDs Deleted: ${totalSenderKeyIds}
Account Sync Deleted: ${totalAccountSync}
Old Pre-Keys Deleted: ${totalPreKeys}
Session Messages Deleted: ${totalSessionMessages}
Message Retry Data Deleted: ${totalMessageRetry}
Noise Keys Deleted: ${noiseKeys}
Peer Device Data Deleted: ${peerDevice}

Total Keys Deleted: ${totalDeleted}

Maintenance:
${maintenanceStatus}
        `.trim();

        await m.reply(cap);
    } catch (e) {
        conn.logger.error({
            err: e.message,
            stack: e.stack,
            context: "cleanup-handler-error",
        });
        await m.reply(`Cleanup failed: ${e.message}`);
    } finally {
        release();
        await global.loading(m, conn, true);
    }
};

handler.help = ["fix"];
handler.tags = ["owner"];
handler.command = /^(fix)$/i;
handler.owner = true;

export default handler;
