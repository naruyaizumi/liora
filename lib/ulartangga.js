import sharp from 'sharp'
import https from 'https'
import { tmpdir } from 'os'
import { writeFile, unlink, readFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

class GameSession {
constructor(id, sMsg) {
this.id = id
this.players = []
this.game = new SnakeAndLadderGame(sMsg)
}
}

class SnakeAndLadderGame {
constructor(sMsg) {
this.sendMsg = sMsg
this.players = []
this.boardSize = 100
this.snakesAndLadders = [
{ start: 29, end: 7 }, { start: 24, end: 12 },
{ start: 15, end: 37 }, { start: 23, end: 41 },
{ start: 72, end: 36 }, { start: 49, end: 86 },
{ start: 90, end: 56 }, { start: 75, end: 64 },
{ start: 74, end: 95 }, { start: 91, end: 72 },
{ start: 97, end: 78 }
]
this.currentPositions = {}
this.currentPlayerIndex = 0
this.bgImageUrl = 'https://i.pinimg.com/originals/2f/68/a7/2f68a7e1eee18556b055418f7305b3c0.jpg'
this.playerImageUrls = {
red: 'https://cdn.icon-icons.com/icons2/2620/PNG/512/among_us_player_red_icon_156942.png',
green: 'https://cdn.icon-icons.com/icons2/2620/PNG/512/among_us_player_green_icon_156937.png'
}
this.bgImage = null
this.playerImages = { red: null, green: null }
this.cellWidth = 40
this.cellHeight = 40
this.keyId = null
this.started = false
}

initializeGame() {
this.players.forEach(player => (this.currentPositions[player] = 1))
this.currentPlayerIndex = 0
this.started = true
}

rollDice = (num) => Array.from({ length: num }, () => Math.floor(Math.random() * 6) + 1)[Math.floor(Math.random() * num)]

fetchImage = async (url) => {
let res = await fetch(url, { agent: new https.Agent({ rejectUnauthorized: false }) })
return Buffer.from(Buffer.from(await res.arrayBuffer()))
}

getBoardBuffer = async () => {
const bgPath = path.join(tmpdir(), randomUUID() + '.png')
await writeFile(bgPath, this.bgImage)
let canvas = sharp({
create: {
width: 420,
height: 420,
channels: 4,
background: { r: 255, g: 255, b: 255, alpha: 1 }
}
}).composite([{ input: bgPath, top: 0, left: 0 }])
for (const player of this.players) {
const { x, y } = this.calculatePlayerPosition(player)
const image = await this.getPlayerImage(player)
const temp = path.join(tmpdir(), randomUUID() + '.png')
await writeFile(temp, image)
canvas = canvas.composite([{ input: temp, top: y, left: x }])
await unlink(temp)
}
const result = await canvas.png().toBuffer()
await unlink(bgPath)
return result
}

calculatePlayerPosition = (player) => {
const pos = this.currentPositions[player]
const row = 9 - Math.floor((pos - 1) / 10)
const col = (pos - 1) % 10
return { x: col * this.cellWidth + 10, y: row * this.cellHeight + 10 }
}

getPlayerImage = async (player) => {
const color = this.getPlayerColor(player)
if (!this.playerImages[color]) {
this.playerImages[color] = await this.fetchImage(this.playerImageUrls[color])
}
return await sharp(this.playerImages[color])
.resize(this.cellWidth, this.cellHeight, { fit: 'contain' })
.png().toBuffer()
}

getPlayerColor = (player) => player === this.players[0] ? 'red' : 'green'

startGame = async (m, player1, player2) => {
await m.reply(`🐍🎲 *Selamat datang di Permainan Ular Tangga!* 🎲🐍 \n\n${this.formatPlayerName(player1)} *vs* ${this.formatPlayerName(player2)}`, null, { mentions: [player1, player2] })
this.players = [player1, player2]
await this.initializeGame()
if (!this.bgImage) this.bgImage = await this.fetchImage(this.bgImageUrl)
const { key } = await m.reply(await this.getBoardBuffer())
this.keyId = key
}

formatPlayerName = (player) => {
const color = this.getPlayerColor(player)
return `@${player.split('@')[0]} ( ${color.charAt(0).toUpperCase() + color.slice(1)} )`
}

playTurn = async (m, player) => {
if (!this.players.length) return m.reply('🛑 *Tidak ada permainan aktif.*')
if (player !== this.players[this.currentPlayerIndex]) return m.reply(`🕒 *Bukan giliranmu.*\nSekarang giliran ${this.formatPlayerName(this.players[this.currentPlayerIndex])}`, null, { mentions: [this.players[this.currentPlayerIndex]] })
const dice = this.rollDice(6)
await m.reply(`🎲 ${this.formatPlayerName(player)} melempar dadu: *${dice}*\nDari kotak *${this.currentPositions[player]}* ke *${this.currentPositions[player] + dice}*`, null, { mentions: this.players })
let newPos = this.currentPositions[player] + dice
for (const other of this.players) {
if (other !== player && this.currentPositions[other] === newPos) {
await m.reply(`😱 ${this.formatPlayerName(player)} menginjak ${this.formatPlayerName(other)}\nKembali ke awal!`, null, { mentions: [player, other] })
newPos = 1
}
}
if (newPos <= this.boardSize) {
const snake = this.snakesAndLadders.find(s => s.start === this.currentPositions[player])
this.currentPositions[player] = snake ? snake.end : newPos
if (snake) {
const move = snake.end < snake.start ? 'ular' : 'tangga'
await m.reply(`🐍 ${this.formatPlayerName(player)} menemukan ${move}! Ke kotak *${snake.end}*`, null, { mentions: this.players })
}
if (this.currentPositions[player] === this.boardSize) {
await m.reply(`🎉 ${this.formatPlayerName(player)} menang!`, null, { mentions: [player] })
await this.resetSession()
return
}
if (dice !== 6) this.currentPlayerIndex = 1 - this.currentPlayerIndex
else await m.reply('🎲 *Anda dapat 6*, giliran lanjut.', null, { mentions: this.players })
} else {
await m.reply('🔄 Lewat batas, posisi direset.', null, { mentions: this.players })
this.currentPositions[player] = 1
this.currentPlayerIndex = 1 - this.currentPlayerIndex
}
const buf = await this.getBoardBuffer()
await this.sendMsg.sendMessage(m.chat, { delete: this.keyId })
const { key } = await m.reply(buf)
this.keyId = key
}

addPlayer = (p) => this.players.length < 2 && !this.players.includes(p) && (this.players.push(p), true)

resetSession = () => {
this.players = []
this.currentPositions = {}
this.currentPlayerIndex = 0
this.started = false
}

isGameStarted = () => this.started
}

export default GameSession