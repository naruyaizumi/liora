
export async function before(m) {
let user = global.db.data.users[m.sender]
let now = new Date() * 1
if (!user.lastPhoenixRegen) user.lastPhoenixRegen = 0
let cooldown = 10 * 60 * 1000
let maxHealth = 100 + user.level * 10
if (user.phoenix > 0 && now - user.lastPhoenixRegen >= cooldown) {
let regen = 10 * user.phoenix
user.health = Math.min(user.health + regen, maxHealth)
user.lastPhoenixRegen = now
}
}