export async function before(m, { conn, isOwner, isMods }) {
    if (isOwner || isMods) return true;
    conn.ev.on("call", async (call) => {
        const settings = global.db.data.settings?.[conn.user.lid];
        if (!settings) return;
        if (call[0].status === "offer" && settings.anticall) {
            const caller = call[0].from;
            try {
                await conn.rejectCall(call[0].id, caller);
                await conn.updateBlockStatus(caller, "block");
            } catch (e) {
                conn.logger.error(e);
            }
        }
    });

    return true;
}
