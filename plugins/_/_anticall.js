export async function before(m, { isMods, isOwner }) {
    if (isOwner || isMods) return true;
    this.ev.on("call", async (call) => {
        let settings = global.db.data.settings[this.user.jid];
        if (!settings) return;
        if (call[0].status === "offer" && settings.anticall) {
            const caller = call[0].from;
            try {
                await this.rejectCall(call[0].id, caller);
                global.db.data.users[caller] = {
                    ...(global.db.data.users[caller] || {}),
                    banned: true,
                };
                await this.updateBlockStatus(caller, "block");
            } catch (e) {
                console.error(e);
            }
        }
    });
    return true;
}
