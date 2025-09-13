
import similarity from 'similarity'
const threshold = 0.72

export async function before(m) {
try {
if (m.isBaileys || m.fromMe || !m.text) return
this.katla = this.katla || {}
const id = m.chat
const session = this.katla[id]
if (!id || !Array.isArray(session)) return
const [quotedMessage, game, timeout] = session
if (/^(nyerah|surrender|menyerah)$/i.test(m.text.trim())) {
clearTimeout(timeout)
await this.reply(m.chat, `🏳️ *Kamu menyerah!*\n*Jawaban: ${game.secret.toUpperCase()}*`, m)
delete this.katla[id]
return
}
if (m.quoted && m.quoted.id !== quotedMessage?.key?.id) return
const guess = m.text.toLowerCase().trim()
const wordLength = game.secret.length
if (guess.length !== wordLength)
return this.reply(m.chat, `❌ *Tebakan harus ${wordLength} huruf!*`, m)
if (!game.words.includes(guess))
return this.reply(m.chat, `❌ *Kata tidak valid!*\n*Gunakan kata baku ${wordLength} huruf dari KBBI*`, m)
const result = checkGuess(game.secret, guess)
game.guesses.push(`${guess.toUpperCase()}: ${result}`)
game.remaining--
let reply = `📊 *HASIL TEBAKAN (${6 - game.remaining}/6)*\n\n`
reply += game.guesses.map(g => `*${g}*`).join('\n') + '\n'
if (guess === game.secret) {
reply += '\n🎉 *BENAR!* 🎉\n'
reply += `*Kata: ${game.secret.toUpperCase()}*`
clearTimeout(timeout)
delete this.katla[id]
} else if (game.remaining <= 0) {
reply += '\n❌ *GAME OVER!* ❌\n'
reply += `*Jawaban: ${game.secret.toUpperCase()}*`
clearTimeout(timeout)
delete this.katla[id]
} else {
if (similarity(guess, game.secret) >= threshold) {
reply += '\n🟨 *Dikit lagi!*'
} else {
reply += '\n💡 *Tebak lagi!*'
}
}
await this.reply(m.chat, reply, m)
} catch (error) {
console.error('Error in katla game:', error)
await this.reply(m.chat, `❌ *Terjadi error dalam game:*\n${error.message}`, m)
}
}

function checkGuess(secret, guess) {
const result = []
const secretArr = [...secret]
const guessArr = [...guess]
for (let i = 0; i < secret.length; i++) {
if (guessArr[i] === secretArr[i]) {
result.push('🟩')
secretArr[i] = null
guessArr[i] = null
}
}
for (let i = 0; i < guess.length; i++) {
if (!guessArr[i]) continue
const foundIndex = secretArr.indexOf(guessArr[i])
if (foundIndex !== -1) {
result.push('🟨')
secretArr[foundIndex] = null
} else {
result.push('⬛️')
}
}
return result.join('')
}

export const exp = 0