
const STRIKE_CONFIG = {
    damageRange: [1000, 5000],
    criticalMultiplier: 10,
    cooldown: 300000,
    strikeTypes: [
        'PLASMA', 'ION', 'QUANTUM', 
        'NEUTRON', 'ANTIMATTER', 'GRAVITON'
    ]
};

const handler = async (m, { conn, usedPrefix, command, isOwner }) => {

    const isMods = global.mods && global.mods.includes(m.sender);
    if (!isOwner && !isMods) return m.reply('🛡️ *Hanya Owner dan Mods yang bisa menggunakan perintah ini!*');
    

    let users = global.db.data.users;
    let sender = m.sender;
    

    let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : '';
    if (!who) return m.reply(`☄️ *Tag atau reply target!*\nContoh: ${usedPrefix}${command} @target`);
    if (!(who in users)) return m.reply('💔 Target tidak terdaftar!');
    if (who === sender) return m.reply('😵 Tidak bisa menyerang diri sendiri!');


    let __timers = (new Date - (users[sender]?.lastorbital || 0));
    let _timers = (STRIKE_CONFIG.cooldown - __timers);
    let timers = clockString(_timers);
    if (__timers < STRIKE_CONFIG.cooldown) {
        return m.reply(`⏳ *Recharging*\nTunggu ${timers} lagi`);
    }

    const target = users[who];
    const isCritical = Math.random() < 0.3;

    try {
        await conn.sendPresenceUpdate('composing', m.chat);

     
        const lockMsg = await conn.reply(m.chat,
            `🎯 *TARGET LOCKED*\n` +
            `Scanning @${who.split('@')[0]}...\n` +
            `[===== 50%]`,
            m, { mentions: [who] }
        );

     
        await new Promise(resolve => setTimeout(resolve, 2000));
        await conn.relayMessage(m.chat, {
            protocolMessage: {
                key: lockMsg.key,
                type: 14,
                editedMessage: {
                    conversation: `⚡ *CHARGING*\n` +
                                 `Weapon: ${pickRandom(STRIKE_CONFIG.strikeTypes)}\n` +
                                 `[======= 80%]`
                }
            }
        }, {});

    
        await new Promise(resolve => setTimeout(resolve, 2000));
        const damage = calculateDamage(isCritical);
        const strikeType = pickRandom(STRIKE_CONFIG.strikeTypes);

        await conn.relayMessage(m.chat, {
            protocolMessage: {
                key: lockMsg.key,
                type: 14,
                editedMessage: {
                    conversation: `☄️ *STRIKE INCOMING*\n` +
                                 `Type: ${strikeType}\n` +
                                 `Damage: ${damage.toLocaleString()}${isCritical ? ' (CRITICAL!)' : ''}`
                }
            }
        }, {});

      
        target.health = (target.health || 100) - damage;
        if (target.health < 0) target.health = 0;
        
      
        if (!users[sender]) users[sender] = {};
        users[sender].lastorbital = new Date * 1;

     
        await conn.sendMessage(m.chat, {
            text: `💥 *TARGET HIT*\n` +
                  `Victim: @${who.split('@')[0]}\n` +
                  `Damage: ${damage.toLocaleString()}${isCritical ? ' 💀 CRITICAL!' : ''}\n` +
                  `Weapon: ${strikeType} CANNON\n` +
                  `❤️ HP Target: ${target.health}/${target.maxhealth || 100}`,
            mentions: [who]
        }, { quoted: m });

    } catch (error) {
        console.error('Error:', error);
        conn.reply(m.chat, `❌ Gagal: ${error.message}`, m);
    }
};


function calculateDamage(isCritical) {
    const [min, max] = STRIKE_CONFIG.damageRange;
    const baseDamage = Math.floor(Math.random() * (max - min + 1)) + min;
    return isCritical ? baseDamage * STRIKE_CONFIG.criticalMultiplier : baseDamage;
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function clockString(ms) {
    let h = Math.floor(ms / 3600000);
    let m = Math.floor(ms / 60000) % 60;
    let s = Math.floor(ms / 1000) % 60;
    return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':');
}

handler.help = ['orbitalstrike'];
handler.tags = ['rpg'];
handler.command = /^(orbital(strike|nuke)|os)$/i;
handler.group = true;
handler.rpg = true;

export default handler;