let handler = async (m, { conn }) => {
let vcard = `BEGIN:VCARD
VERSION:3.0
FN:𝑵𝒂𝒓𝒖𝒚𝒂 𝑰𝒛𝒖𝒎𝒊
ORG:𝑵𝒂𝒓𝒖𝒚𝒂 𝑰𝒛𝒖𝒎𝒊
TITLE:Metatron Executioner of Michael
EMAIL;type=INTERNET:sexystyle088@gmail.com
TEL;type=CELL;waid=40766498692:+40766498692
ADR;type=WORK:;;2-chōme-7-5 Fuchūchō;Izumi;Osaka;594-0071;Japan
URL;type=WORK:https://www.instagram.com/naruyaizumi
X-WA-BIZ-NAME:𝑵𝒂𝒓𝒖𝒚𝒂 𝑰𝒛𝒖𝒎𝒊
X-WA-BIZ-DESCRIPTION:𝐓𝐡𝐞 𝐃𝐞𝐯𝐞𝐥𝐨𝐩𝐞𝐫 𝐎𝐟 𝐋𝐢𝐨𝐫𝐚
X-WA-BIZ-HOURS:Mo-Su 00:00-23:59
END:VCARD`
let qkontak = {
key: {
fromMe: false,
participant: "0@s.whatsapp.net",
remoteJid: "status@broadcast"
},
message: {
contactMessage: {
displayName: "𝑵𝒂𝒓𝒖𝒚𝒂 𝑰𝒛𝒖𝒎𝒊",
vcard
}
}
}
const res = await fetch('https://files.cloudkuimages.guru/images/XBswWt82.jpg')
const arrayBuffer = await res.arrayBuffer()
const thumbBuffer = Buffer.from(arrayBuffer)
await conn.sendMessage(m.chat, {
text: 'Body Message',
title: 'Title Message', 
subtile: 'Subtitle Message', 
footer: 'Footer Message',
cards: [
{
image: { url: 'https://files.cloudkuimages.guru/images/7Yiu4OMt.jpg' },
title: 'Title Cards',
body: 'Body Cards',
footer: 'Footer Cards',
buttons: [
{
name: 'quick_reply',
buttonParamsJson: JSON.stringify({
display_text: 'Owner!',
id: '.owner'
})
},
{
name: 'cta_url',
buttonParamsJson: JSON.stringify({
display_text: 'Channel',
url: 'https://whatsapp.com/channel/0029Vb5vz4oDjiOfUeW2Mt03',
merchant_url: 'https://whatsapp.com/channel/0029Vb5vz4oDjiOfUeW2Mt03'
})
},
{
name: 'cta_copy',
buttonParamsJson: JSON.stringify({
display_text: 'Copy Code',
copy_code: 'https://whatsapp.com/channel/0029Vb5vz4oDjiOfUeW2Mt03'
})
},
{
name: 'cta_call',
buttonParamsJson: JSON.stringify({
display_text: 'Call Me!',
phone_number: '6283143663697'
})
},
{
name: 'cta_catalog',
buttonParamsJson: JSON.stringify({
business_phone_number: '6283143663697'
})
},
{
name: 'cta_reminder',
buttonParamsJson: JSON.stringify({
display_text: 'Ingatkan Saya'
})
},
{
name: 'cta_cancel_reminder',
buttonParamsJson: JSON.stringify({
display_text: 'Batal Ingatkan'
})
},
{
name: 'address_message',
buttonParamsJson: JSON.stringify({
display_text: 'Alamat Saya'
})
},
{
name: 'send_location',
buttonParamsJson: JSON.stringify({
display_text: 'Lokasi Saya'
})
},
{
name: 'open_webview',
buttonParamsJson: JSON.stringify({
title: 'Website',
link: {
in_app_webview: true,
url: 'https://whatsapp.com/channel/0029Vb5vz4oDjiOfUeW2Mt03'
}
})
},
{
name: 'mpm',
buttonParamsJson: JSON.stringify({
product_id: '8816262248471474'
})
},
{
name: 'wa_payment_transaction_details',
buttonParamsJson: JSON.stringify({
transaction_id: '12345848'
})
},
{
name: 'automated_greeting_message_view_catalog',
buttonParamsJson: JSON.stringify({
business_phone_number: '6283143663697', 
catalog_product_id: '12345'
})
},
{
name: 'galaxy_message', 
buttonParamsJson: JSON.stringify({
mode: 'published', 
flow_message_version: '3', 
flow_token: '1:1307913409923914:293680f87029f5a13d1ec5e35e718af3',
flow_id: '1307913409923914',
flow_cta: 'Naruya Izumi', 
flow_action: 'navigate', 
flow_action_payload: {
screen: 'QUESTION_ONE',
params: {
user_id: '123456789', 
referral: 'campaign_xyz'
}
}, 
flow_metadata: {
flow_json_version: '201', 
data_api_protocol: 'v2', 
flow_name: 'Lead Qualification [en]',
data_api_version: 'v2', 
categories: ['Lead Generation', 'Sales']
}
}) 
}, 
{
name: 'single_select',
buttonParamsJson: JSON.stringify({
title: 'Click Me!',
sections: [
{
title: 'Title 1',
highlight_label: 'Highlight label 1',
rows: [
{
header: 'Header 1',
title: 'Title 1',
description: 'Description 1',
id: 'Id 1'
},
{
header: 'Header 2',
title: 'Title 2',
description: 'Description 2',
id: 'Id 2'
}
]
}
]
})
}
]
},
{
image: { url: 'https://files.cloudkuimages.guru/images/7Yiu4OMt.jpg' },
title: 'Title Cards',
body: 'Body Cards',
footer: 'Footer Cards',
buttons: [
{
name: 'quick_reply',
buttonParamsJson: JSON.stringify({
display_text: 'Owner!',
id: '.owner'
})
},
{
name: 'cta_url',
buttonParamsJson: JSON.stringify({
display_text: 'Channel',
url: 'https://whatsapp.com/channel/0029Vb5vz4oDjiOfUeW2Mt03',
merchant_url: 'https://whatsapp.com/channel/0029Vb5vz4oDjiOfUeW2Mt03'
})
},
{
name: 'cta_copy',
buttonParamsJson: JSON.stringify({
display_text: 'Copy Code',
copy_code: 'https://whatsapp.com/channel/0029Vb5vz4oDjiOfUeW2Mt03'
})
},
{
name: 'cta_call',
buttonParamsJson: JSON.stringify({
display_text: 'Call Me!',
phone_number: '6283143663697'
})
},
{
name: 'cta_catalog',
buttonParamsJson: JSON.stringify({
business_phone_number: '6283143663697'
})
},
{
name: 'cta_reminder',
buttonParamsJson: JSON.stringify({
display_text: 'Ingatkan Saya'
})
},
{
name: 'cta_cancel_reminder',
buttonParamsJson: JSON.stringify({
display_text: 'Batal Ingatkan'
})
},
{
name: 'address_message',
buttonParamsJson: JSON.stringify({
display_text: 'Alamat Saya'
})
},
{
name: 'send_location',
buttonParamsJson: JSON.stringify({
display_text: 'Lokasi Saya'
})
},
{
name: 'open_webview',
buttonParamsJson: JSON.stringify({
title: 'Website',
link: {
in_app_webview: true,
url: 'https://whatsapp.com/channel/0029Vb5vz4oDjiOfUeW2Mt03'
}
})
},
{
name: 'mpm',
buttonParamsJson: JSON.stringify({
product_id: '8816262248471474'
})
},
{
name: 'wa_payment_transaction_details',
buttonParamsJson: JSON.stringify({
transaction_id: '12345848'
})
},
{
name: 'automated_greeting_message_view_catalog',
buttonParamsJson: JSON.stringify({
business_phone_number: '6283143663697', 
catalog_product_id: '12345'
})
},
{
name: 'galaxy_message', 
buttonParamsJson: JSON.stringify({
mode: 'published', 
flow_message_version: '3', 
flow_token: '1:1307913409923914:293680f87029f5a13d1ec5e35e718af3',
flow_id: '1307913409923914',
flow_cta: 'Naruya Izumi', 
flow_action: 'navigate', 
flow_action_payload: {
screen: 'QUESTION_ONE',
params: {
user_id: '123456789', 
referral: 'campaign_xyz'
}
}, 
flow_metadata: {
flow_json_version: '201', 
data_api_protocol: 'v2', 
flow_name: 'Lead Qualification [en]',
data_api_version: 'v2', 
categories: ['Lead Generation', 'Sales']
}
}) 
}, 
{
name: 'single_select',
buttonParamsJson: JSON.stringify({
title: 'Click Me!',
sections: [
{
title: 'Title 1',
highlight_label: 'Highlight label 1',
rows: [
{
header: 'Header 1',
title: 'Title 1',
description: 'Description 1',
id: 'Id 1'
},
{
header: 'Header 2',
title: 'Title 2',
description: 'Description 2',
id: 'Id 2'
}
]
}
]
})
}
]
}
]
}, { quoted: qkontak })
await conn.sendMessage(m.chat, {
text: 'This is a list!',
footer: 'Hello World!',
title: 'Amazing boldfaced list title',
buttonText: 'Required, text on the button to view the list',
sections: [
{
title: 'Section 1',
rows: [
{
title: 'Option 1',
rowId: 'option1'
},
{
title: 'Option 2',
rowId: 'option2',
description: 'This is a description'
}
]
},
{
title: 'Section 2',
rows: [
{
title: 'Option 3',
rowId: 'option3'
},
{
title: 'Option 4',
rowId: 'option4',
description: 'This is a description V2'
}
]
},
{
title: 'Section 3',
rows: [
{
title: 'Option 5',
rowId: 'option5'
},
{
title: 'Option 6',
rowId: 'option6',
description: 'This is a description V3'
}
]
},
{
title: 'Section 4',
rows: [
{
title: 'Option 7',
rowId: 'option7'
},
{
title: 'Option 8',
rowId: 'option8',
description: 'This is a description V4'
}
]
}
]
}, { quoted: qkontak })
await conn.sendMessage(m.chat, {
text: 'This is a list!',
footer: 'Hello World!',
title: 'Amazing boldfaced list title',
buttonText: 'Required, text on the button to view the list',
productList: [
{
title: 'This is a title',
products: [
{
productId: '30070814369229660'
},
{
productId: '30070814369229660'
}
]
}
],
businessOwnerJid: '40766498692@s.whatsapp.net',
thumbnail: 'https://cloudkuimages.guru/uploads/images/zUe9nkQD.jpg'
}, { quoted: qkontak })
await conn.sendMessage(m.chat, {
text: 'aaa',
interactiveButtons: [
{
name: 'payment_info',
buttonParamsJson: JSON.stringify({
payment_settings: [{
type: "pix_static_code",
pix_static_code: {
merchant_name: 'test',
key: 'example@gmail.com',
key_type: 'EMAIL'
}
}]
})
}
]
}, { quoted: qkontak })
await conn.sendMessage(m.chat,{
order: {
orderId: '24529689176623820',
thumbnail: thumbBuffer,
itemCount: 1,
status: 'INQUIRY',
surface: 'CATALOG',
message: 'Pembelian Script Liora',
orderTitle: "Script WhatsApp MD – Liora",
sellerJid: '40766498692@s.whatsapp.net',
token: 'order_' + Math.floor(Math.random() * 1e10),
totalAmount1000: '80000000',
totalCurrencyCode: 'IDR'
}
}, { quoted: qkontak })
await conn.sendMessage(m.chat, {
product: {
productImage: { url: 'https://files.cloudkuimages.guru/images/XBswWt82.jpg' },
productId: '24529689176623820',
title: 'Script WhatsApp MD – Liora',
description: 'Modern. Modular. API-Powered.\nLifetime Support & 1000+ Fitur Lengkap.',
currencyCode: 'IDR',
priceAmount1000: '80000000',
retailerId: 'Naruya Izumi',
url: 'https://wa.me/p/24529689176623820/40766498692',
productImageCount: 1,
firstImageId: 'liora-img-001',
salePriceAmount1000: '80000000',
signedUrl: 'https://files.cloudkuimages.guru/images/XBswWt82.jpg'
},
businessOwnerJid: '40766498692@s.whatsapp.net'
}, { quoted: qkontak })
}

handler.help = ['node']
handler.tags = ['node']
handler.command = /^(node)$/i
handler.mods = true

export default handler