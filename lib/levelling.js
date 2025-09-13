export function xpRange(level) {
level = Math.floor(level)
let base = 100
let min = Math.floor((level ** 2.8) * base + (level * 25) + (Math.log2(level + 2) * 500))
let max = Math.floor(((level + 1) ** 2.8) * base + ((level + 1) * 25) + (Math.log2(level + 3) * 500))
return { min, max, xp: max - min }
}

export function findLevel(xp) {
let level = 0
while (true) {
let { max } = xpRange(level)
if (xp < max) return level
level++
}
}

export function canLevelUp(level, xp) {
return level < findLevel(xp)
}