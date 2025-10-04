let handler = async (m, { conn }) => {
  let startTime = performance.now();
  let endTime = performance.now();
  let responseTime = (endTime - startTime).toFixed(6);
  let message = `*PING PONG* 🏓
🚀 *Response: ${responseTime} ms*`;

  await conn.sendMessage(m.chat, { text: message });
};

handler.help = ["ping"];
handler.tags = ["info"];
handler.command = /^(ping)$/i;
handler.owner = true;

export default handler;
