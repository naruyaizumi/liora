export async function before(m, { isMods, isOwner }) {
if (isOwner || isMods) return true
this.ev.on('call', async (call) => {
const settings = global.db.data.settings[this.user.jid]
if (call[0].status === 'offer' && settings.anticall) {
const caller = call[0].from
await this.rejectCall(call[0].id, caller)
global.db.data.users[caller] = {
...(global.db.data.users[caller] || {}),
banned: true
}
await this.updateBlockStatus(caller, "block")
}
})
return true
}