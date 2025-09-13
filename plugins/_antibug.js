
export async function before(m) {
let user = global.db.data.users[m.sender]
user.exp = Math.min(Math.max(user.exp, 0), Number.MAX_SAFE_INTEGER)
user.money = Math.min(Math.max(user.money, 0), Number.MAX_SAFE_INTEGER)
user.bank = Math.min(Math.max(user.bank, 0), Number.MAX_SAFE_INTEGER)
user.limit = Math.min(Math.max(user.limit, 0), Number.MAX_SAFE_INTEGER)
if (user.atm > 0 && user.money >= Number.MAX_SAFE_INTEGER) {
let keBank = user.money - Number.MAX_SAFE_INTEGER
user.money = Number.MAX_SAFE_INTEGER
user.bank = Math.min(user.bank + keBank, Number.MAX_SAFE_INTEGER)
}
let expectedHealth = Math.min(100 + user.level * 10, Number.MAX_SAFE_INTEGER)
let expectedEnergy = Math.min(50 + user.level * 5, Number.MAX_SAFE_INTEGER)
user.health = Math.max(0, Math.min(user.health ?? expectedHealth, expectedHealth))
user.energy = Math.max(0, Math.min(user.energy ?? expectedEnergy, expectedEnergy))
let pets = ['cat', 'dog', 'horse', 'fox', 'dragon', 'lion', 'rhinoceros', 'centaur', 'scorpion', 'griffin', 'phoenix', 'wolf', 'robo']
for (let pet of pets) {
if (typeof user[pet] !== 'number') user[pet] = 0
user[pet] = Math.max(0, Math.min(user[pet], 100))
}
}