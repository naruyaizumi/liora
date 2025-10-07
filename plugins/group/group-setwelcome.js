let handler = async (m, { text, usedPrefix, command }) => {
  let chat = global.db.data.chats[m.chat]
  if (!chat) chat = global.db.data.chats[m.chat] = {}

  if (!text) {
    if (chat.sWelcome) {
      chat.sWelcome = ""
      return m.reply("Welcome message has been reset.\nNo active greeting message in this group.")
    } else {
      return m.reply(
        `Enter the welcome text.\n› Example: ${usedPrefix + command} Hello @user, welcome to @subject\n\nAvailable placeholders:\n• @user = mention\n• @subject = group name\n• @desc = group description`
      )
    }
  }

  chat.sWelcome = text
  return m.reply("Welcome message successfully updated.")
}

handler.help = ["setwelcome"]
handler.tags = ["group"]
handler.command = /^(setwelcome|setw)$/i
handler.group = true
handler.admin = true

export default handler