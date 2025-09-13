import * as cheerio from 'cheerio'
import fs from 'fs'
import WebSocket from "ws"
import { join } from 'path'
import https from 'https'

function generateRandomLetters(length, uppercase = false) {
let chars = uppercase ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : 'abcdefghijklmnopqrstuvwxyz'
let result = ''
for (let i = 0; i < length; i++)
result += chars[Math.floor(Math.random() * chars.length)]
return result
}

const otakudesu = {
search: async title => {
let res = await fetch(`https://otakudesu.cloud/?s=${title}&post_type=anime`, {
headers: {
"user-agent": "Mozilla/5.0 (Linux Android 10 RMX2020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Mobile Safari/537.36"
}
})
let data = await res.text()
const $ = cheerio.load(data)
const searchResults = []
$('.chivsrc li').each((index, element) => {
const title = $(element).find('h2 > a').text()
const link = $(element).find('h2 > a').attr('href')
const image = $(element).find('img').attr('src')
const genres = []
$(element).find('.set:contains("Genres") a').each((i, el) => {
genres.push($(el).text())
})
const status = $(element).find('.set:contains("Status")').text().split(':')[1].trim()
const rating = $(element).find('.set:contains("Rating")').text().split(':')[1]?.trim() || 'N/A'
searchResults.push({ title, link, image, genres, status, rating })
})
return searchResults
},
detail: async url => {
let res = await fetch(url, {
headers: {
"user-agent": "Mozilla/5.0 (Linux Android 10 RMX2020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Mobile Safari/537.36"
}
})
let data = await res.text()
let $ = cheerio.load(data)
let link_eps = []
$('#venkonten > div.venser > div.episodelist > ul > li').each((a, b) => {
link_eps.push({
episode: $(b).find('span > a').text(), upload_at: $(b).find('span.zeebr').text(), link: $(b).find('span > a').attr('href')
})
})
let hasil = {
title: {
indonesia: $('#venkonten > div.venser > div.jdlrx > h1').text(),
anonym: $('#venkonten > div.venser > div.fotoanime > div.infozin > div > p:nth-child(1) > span').text().replace('Judul: ', ''),
japanese: $('#venkonten > div.venser > div.fotoanime > div.infozin > div > p:nth-child(2) > span').text().replace('Japanese: ', '')
},
thumbnail: $('.fotoanime > img').attr("src"),
score: $('#venkonten > div.venser > div.fotoanime > div.infozin > div > p:nth-child(3) > span').text().replace('Skor: ', ''),
producer: $('#venkonten > div.venser > div.fotoanime > div.infozin > div > p:nth-child(4) > span').text().replace('Produser: ', ''),
type: $('#venkonten > div.venser > div.fotoanime > div.infozin > div > p:nth-child(5) > span').text().replace('Tipe: ', ''),
status: $('#venkonten > div.venser > div.fotoanime > div.infozin > div > p:nth-child(6) > span').text().replace('Status: ', ''),
total_eps: $('#venkonten > div.venser > div.fotoanime > div.infozin > div > p:nth-child(7) > span').text().replace('Total Episode: ', ''),
duration: $('#venkonten > div.venser > div.fotoanime > div.infozin > div > p:nth-child(8) > span').text().replace('Durasi: ', ''),
release: $('#venkonten > div.venser > div.fotoanime > div.infozin > div > p:nth-child(9) > span').text().replace('Tanggal Rilis: ', ''),
studio: $('#venkonten > div.venser > div.fotoanime > div.infozin > div > p:nth-child(10) > span').text().replace('Studio: ', ''),
genre: $('#venkonten > div.venser > div.fotoanime > div.infozin > div > p:nth-child(11) > span').text().replace('Genre: ', ''),
synopsis: $('#venkonten > div.venser > div.fotoanime > div.sinopc > p').text(),
link_eps: link_eps
}
return hasil
},
download: async url => {
let res = await fetch(url, {
headers: {
"user-agent": "Mozilla/5.0 (Linux Android 10 RMX2020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Mobile Safari/537.36"
}
})
let data = await res.text()
let $ = cheerio.load(data)
let mp4 = []
$('#venkonten > div.venser > div.venutama > div.download > ul:nth-child(2) > li').each((a, b) => {
$(b).find('a').each((c, d) => {
mp4.push({
resolusi: $(b).find('strong').text(), size: $(b).find('i').text(), type: $(d).text(), link: $(d).attr('href')
})
})
})
let mkv = []
$('#venkonten > div.venser > div.venutama > div.download > ul:nth-child(3) > li').each((a, b) => {
$(b).find('a').each((c, d) => {
mkv.push({
resolusi: $(b).find('strong').text(), size: $(b).find('i').text(), type: $(d).text(), link: $(d).attr('href')
})
})
})
let hasil = {
title: $('#venkonten > div.venser > div.venutama > h1').text(),
post: $('#venkonten > div.venser > div.venutama > div.kategoz > span:nth-child(2)').text().replace('Posted by ', ''),
release: $('#venkonten > div.venser > div.venutama > div.kategoz > span:nth-child(4)').text().replace('Release on ', ''),
credit: $('#venkonten > div.venser > div.cukder > div.infozin > div > p:nth-child(1)').text().replace('Credit: ', ''),
encoder: $('#venkonten > div.venser > div.cukder > div.infozin > div > p:nth-child(2)').text().replace('Encoder: ', ''),
genres: $('#venkonten > div.venser > div.cukder > div.infozin > div > p:nth-child(3)').text().replace('Genres: ', ''),
duration: $('#venkonten > div.venser > div.cukder > div.infozin > div > p:nth-child(4)').text().replace('Duration: ', ''),
type: $('#venkonten > div.venser > div.cukder > div.infozin > div > p:nth-child(5)').text().replace('Tipe: ', ''),
image: $('#venkonten > div.venser > div.cukder > img').attr('src'),
link_mp4: mp4,
link_mkv: mkv
}
return hasil
},
ongoing: async () => {
let res = await fetch('https://otakudesu.cloud/ongoing-anime/', {
headers: {
"user-agent": "Mozilla/5.0 (Linux Android 10 RMX2020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Mobile Safari/537.36"
}
})
let data = await res.text()
const $ = cheerio.load(data)
const ongoingList = []
$('.venz ul li').each((index, element) => {
const episode = $(element).find('.epz').text().trim()
const day = $(element).find('.epztipe').text().trim()
const date = $(element).find('.newnime').text().trim()
const title = $(element).find('.jdlflm').text().trim()
const link = $(element).find('.thumb a').attr('href')
const image = $(element).find('.thumbz img').attr('src')
ongoingList.push({ episode, day, date, title, link, image })
})
return ongoingList
}
}

async function anime(q) {
return new Promise(async (resolve, reject) => {
try {
const res1 = await fetch('https://myanimelist.net/anime.php?cat=anime&q=' + q)
const html1 = await res1.text()
const $ = cheerio.load(html1)
let anime = []
$('#content > div.js-categories-seasonal.js-block-list.list > table > tbody > tr').each(function (a, b) {
anime.push($(b).find('td:nth-child(1) > div > a').attr('href') || '')
})
const res2 = await fetch(anime[0] ? anime[0] : anime[1])
const html2 = await res2.text()
const $$ = cheerio.load(html2)
let related = []
$$('#content > table > tbody > tr > td:nth-child(2) > div.js-scrollfix-bottom-rel > table > tbody > tr:nth-child(3) > td > table > tbody > tr').each(function (a, b) {
related.push({
type: $$(b).find('td:nth-child(1)').text(),
name: $$(b).find('td:nth-child(2)').text()
})
})
let character = []
$$('#content > table > tbody > tr > td:nth-child(2) > div > table > tbody > tr:nth-child(3) > td > div.detail-characters-list.clearfix').eq(0).find('table').each(function (a, b) {
character.push({
character: {
name: $$(b).find('tbody > tr > td:nth-child(2) > h3').text(),
status: $$(b).find('tbody > tr > td:nth-child(2) > div > small').text(),
detail: $$(b).find('tbody > tr > td:nth-child(2) > h3 > a').attr('href'),
image: $$(b).find('tbody > tr > td.ac.borderClass > div > a > img').attr('data-src') || $$(b).find('tbody > tr > td.ac.borderClass > div > a > img').attr('src')
},
voice_actor: {
name: $$(b).find('tbody > tr > td:nth-child(3) > table > tbody > tr > td.va-t.ar.pl4.pr4 > a').text(),
origin: $$(b).find('tbody > tr > td:nth-child(3) > table > tbody > tr > td.va-t.ar.pl4.pr4 > small').text(),
detail: $$(b).find('tbody > tr > td:nth-child(3) > table > tbody > tr > td.va-t.ar.pl4.pr4 > a').attr('href'),
image: $$(b).find('table > tbody > tr > td:nth-child(2) > div > a > img').attr('data-src') || $$(b).find('table > tbody > tr > td:nth-child(2) > div > a > img').attr('src')
}
})
})
let staff = []
$$('#content > table > tbody > tr > td:nth-child(2) > div > table > tbody > tr:nth-child(3) > td > div.detail-characters-list.clearfix').eq(1).find('table').each(function (a, b) {
staff.push({
name: $$(b).find('tbody > tr > td:nth-child(2) > a').text(),
status: $$(b).find('tbody > tr > td:nth-child(2) > div > small').text(),
detail: $$(b).find('tbody > tr > td:nth-child(2) > a').attr('href'),
image: $$(b).find('tbody > tr > td.ac.borderClass > div > a > img').attr('data-src') || $$(b).find('tbody > tr > td.ac.borderClass > div > a > img').attr('src')
})
})
let info = []
$$('#content > table > tbody > tr > td.borderClass > div > div.spaceit_pad').each(function (a, b) {
info.push({
type: $$(b).text().split(':')[0].trim().split('\n')[0] || $$(b).text().split(':')[0].trim() || '',
result: $$(b).text().split(':')[1].trim().split('\n')[0] || $$(b).text().split(':')[1].trim() || ''
})
})
let hasil = {
title: $$('#contentWrapper > div:nth-child(1) > div > div.h1-title > div > h1').text(),
info: info,
image: $$('#content > table > tbody > tr > td.borderClass > div > div:nth-child(1) > a > img').attr('data-src') || $$('#content > table > tbody > tr > td.borderClass > div > div:nth-child(1) > a > img').attr('src'),
trailer: $$('div.anime-detail-header-video.di-tc.va-t.pl16 > div.video-promotion > a').attr('href'),
synopsis: $$('#content > table > tbody > tr > td:nth-child(2) > div > table > tbody > tr:nth-child(1) > td > p').text(),
related,
character,
staff
}
resolve(hasil)
} catch (e) {
reject(e)
}
})
}

async function manga(q) {
return new Promise(async (resolve, reject) => {
try {
const res1 = await fetch('https://myanimelist.net/manga.php?cat=manga&q=' + q)
const html1 = await res1.text()
const $ = cheerio.load(html1)
let manga = []
$('#content > div.js-categories-seasonal.js-block-list.list > table > tbody > tr').each(function (a, b) {
manga.push($(b).find('td:nth-child(2) > a').attr('href') || '')
})
const res2 = await fetch(manga[0] ? manga[0] : manga[1])
const html2 = await res2.text()
const $$ = cheerio.load(html2)
let related = []
$$('#content > table > tbody > tr > td:nth-child(2) > div.js-scrollfix-bottom-rel > table > tbody > tr:nth-child(3) > td > table > tbody > tr').each(function (a, b) {
related.push({
type: $$(b).find('td:nth-child(1)').text(),
name: $$(b).find('td:nth-child(2) > a').text(),
url: 'https://myanimelist.net' + $$(b).find('td:nth-child(2) > a').attr('href')
})
})
let info = []
$$('#content > table > tbody > tr > td.borderClass > div > div.spaceit_pad').each(function (a, b) {
info.push({
type: $$(b).text().split(':')[0].trim() || '',
result: $$(b).text().split(':')[1].trim()
})
})
let character = []
$$('#content > table > tbody > tr > td:nth-child(2) > div.js-scrollfix-bottom-rel > table > tbody > tr:nth-child(3) > td > div.detail-characters-list.clearfix > div.left-column.fl-l.divider > table').each(function (a, b) {
character.push({
character: {
name: $$(b).find('tbody > tr > td:nth-child(2) > a').text(),
status: $$(b).find('tbody > tr > td:nth-child(2) > div > small').text().trim(),
detail: $$(b).find('tbody > tr > td:nth-child(2) > a').attr('href'),
image: $$(b).find('tbody > tr > td.ac.borderClass > div > a > img').attr('data-src') || $$(b).find('tbody > tr > td.ac.borderClass > div > a > img').attr('src')
}
})
})
let hasil = {
title: $$('#contentWrapper > div:nth-child(1) > h1').text().trim(),
info: info,
image: $$('#content > table > tbody > tr > td.borderClass > div > div:nth-child(1) > a > img').attr('data-src') || $$('#content > table > tbody > tr > td.borderClass > div > div:nth-child(1) > a > img').attr('src'),
synopsis: $$('#content > table > tbody > tr > td:nth-child(2) > div.js-scrollfix-bottom-rel > table > tbody > tr:nth-child(1) > td > span').text(),
related,
character
}
resolve(hasil)
} catch (e) {
reject(e)
}
})
}

async function character(q) {
return new Promise(async (resolve, reject) => {
try {
const res1 = await fetch('https://myanimelist.net/character.php?cat=character&q=' + q)
const html1 = await res1.text()
const $ = cheerio.load(html1)
let character = []
$('#content > table > tbody > tr').each(function (a, b) {
character.push($(b).find('td:nth-child(2) > a').attr('href'))
})
const res2 = await fetch(character[0])
const html2 = await res2.text()
const $$ = cheerio.load(html2)
let voice = []
$$('#content > table > tbody > tr > td:nth-child(2) > table').each(function (a, b) {
voice.push({
name: $$(b).find('td:nth-child(2) > a').text(),
origin: $$(b).find('td:nth-child(2) > div > small').text(),
detail: $$(b).find('td:nth-child(2) > a').attr('href'),
image: $$(b).find('td:nth-child(1) > div > a > img').attr('data-src') || $$(b).find('td:nth-child(1) > div > a > img').attr('src')
})
})
let animeography = []
$$('#content > table > tbody > tr > td.borderClass > table:nth-child(6) > tbody > tr').each(function (a, b) {
animeography.push({
name: $$(b).find('td:nth-child(2) > a').text(),
status: $$(b).find('td:nth-child(2) > div > small').text(),
detail: $$(b).find('td:nth-child(2) > a').attr('href'),
image: $$(b).find('td:nth-child(1) > div > a > img').attr('data-src') || $$(b).find('td:nth-child(1) > div > a > img').attr('src')
})
})
let mangaography = []
$$('#content > table > tbody > tr > td.borderClass > table:nth-child(9) > tbody > tr').each(function (a, b) {
mangaography.push({
name: $$(b).find('td:nth-child(2) > a').text(),
status: $$(b).find('td:nth-child(2) > div > small').text(),
detail: $$(b).find('td:nth-child(2) > a').attr('href'),
image: $$(b).find('td:nth-child(1) > div > a > img').attr('data-src') || $$(b).find('td:nth-child(1) > div > a > img').attr('src')
})
})
let hasil = {
name: $$('#contentWrapper > div:nth-child(1) > div > div.h1-title > h1').text(),
image: $$('#content > table > tbody > tr > td.borderClass > div:nth-child(1) > a > img').attr('data-src') || $$('#content > table > tbody > tr > td.borderClass > div:nth-child(1) > a > img').attr('src'),
detail: $$('#content > table > tbody > tr > td:nth-child(2)').text().split('Characters')[1].split('Voice Actors')[0].trim(),
voice_actor: voice,
animeography,
mangaography
}
resolve(hasil)
} catch (err) {
reject(err)
}
})
}
async function topAnime(type = 'anime') {
return new Promise(async (resolve, reject) => {
try {
let res = await fetch('https://myanimelist.net/topanime.php?type=' + type)
let html = await res.text()
let $ = cheerio.load(html)
let hasil = []
$('tr.ranking-list').each(function (a, b) {
hasil.push({
rank: $(b).find('td.rank.ac > span').text(),
title: $(b).find('td.title.al.va-t.word-break > div > div.di-ib.clearfix > h3').text(),
info: $(b).find('td.title.al.va-t.word-break > div > div.information.di-ib.mt4').text().trim(),
rating: $(b).find('td.score.ac.fs14 > div').text(),
detail: $(b).find('td.title.al.va-t.word-break > div > div.di-ib.clearfix > h3 > a').attr('href'),
image: $(b).find('td.title.al.va-t.word-break > a > img').attr('data-src') || $(b).find('td.title.al.va-t.word-break > a > img').attr('src')
})
})
resolve(hasil)
} catch (err) {
reject(err)
}
})
}

async function topManga(type = 'manga') {
return new Promise(async (resolve, reject) => {
try {
let res = await fetch('https://myanimelist.net/topmanga.php?type=' + type)
let html = await res.text()
let $ = cheerio.load(html)
let hasil = []
$('tr.ranking-list').each(function (a, b) {
hasil.push({
rank: $(b).find('td.rank.ac > span').text(),
title: $(b).find('td.title.al.va-t.clearfix.word-break > div > h3').text(),
info: $(b).find('td.title.al.va-t.clearfix.word-break > div > div.information.di-ib.mt4').text().trim(),
rating: $(b).find('td.score.ac.fs14 > div').text(),
detail: $(b).find('td.title.al.va-t.clearfix.word-break > div > h3 > a').attr('href'),
image: $(b).find('td.title.al.va-t.clearfix.word-break > a > img').attr('data-src') || $(b).find('td.title.al.va-t.clearfix.word-break > a > img').attr('src')
})
})
resolve(hasil)
} catch (err) {
reject(err)
}
})
}

async function jadwalTV(name, m) {
let list
try {
let res = await fetch('https://raw.githubusercontent.com/naruyaizumi/json/main/jadwaltv.json')
if (!res.ok) return m.reply('🍬 *Gagal mengambil data channel.*')
list = await res.json()
} catch {
return m.reply('🍪 *Gagal memuat data jadwal.*')
}
let data = list.find((v) => (new RegExp(name, 'gi')).test(v.channel))
if (!data) {
let daftar = list.map(v => v.channel).sort().join('\n')
return m.reply('🍭 *List Channel yang tersedia:*\n\n' + daftar)
}
let res = await fetch(`https://www.jadwaltv.net/${data.isPay ? 'jadwal-pay-tv/' : ''}${data.value}`)
let html = await res.text()
let $ = cheerio.load(html)
let result = []
$('div > table.table tbody > tr').slice(1).each(function () {
let jam = $(this).find('td').eq(0).text()
let acara = $(this).find('td').eq(1).text()
if (!/Jadwal TV|Acara/i.test(acara)) result.push({ jam, acara })
})
return { channel: data.channel.toUpperCase(), result }
}

async function checkWeb(url) {
let res = await fetch('https://trustpositif.kominfo.go.id/Rest_server/getrecordsname_home', {
method: 'POST',
body: new URLSearchParams(Object.entries({ name: url.join('%0A') })),
agent: new https.Agent({ rejectUnauthorized: false })
})
let json = await res.json()
return json.values
}

async function hoax() {
return new Promise(async (resolve, reject) => {
try {
let res = await fetch(`https://turnbackhoax.id/`)
let html = await res.text()
const $ = cheerio.load(html)
let hasil = []
$("figure.mh-loop-thumb").each(function(a, b) {
$("div.mh-loop-content.mh-clearfix").each(function(c, d) {
let link = $(d).find("h3.entry-title.mh-loop-title > a").attr('href')
let img = $(b).find("img.attachment-mh-magazine-lite-medium.size-mh-magazine-lite-medium.wp-post-image").attr('src')
let title = $(d).find("h3.entry-title.mh-loop-title > a").text().trim()
let desc = $(d).find("div.mh-excerpt > p").text().trim()
let date = $(d).find("span.mh-meta-date.updated").text().trim()
const Data = {
title: title,
thumbnail: img,
desc: desc,
date: date,
link: link
}
hasil.push(Data)
})
})
resolve(hasil)
} catch (e) {
reject(e)
}
})
}

async function cerpen(category) {
return new Promise(async (resolve, reject) => {
try {
let title = category.toLowerCase().replace(/[()*]/g, "")
let judul = title.replace(/\s/g, "-")
let page = Math.floor(Math.random() * 5)
let res = await fetch('http://cerpenmu.com/category/cerpen-' + judul + '/page/' + page)
let html = await res.text()
let $ = cheerio.load(html)
let link = []
$('article.post').each(function(a, b) {
link.push($(b).find('a').attr('href'))
})
let random = link[Math.floor(Math.random() * link.length)]
let res2 = await fetch(random)
let html2 = await res2.text()
let $$ = cheerio.load(html2)
let hasil = {
title: $$('#content > article > h1').text(),
author: $$('#content > article').text().split('Cerpen Karangan: ')[1].split('Kategori: ')[0],
kategori: $$('#content > article').text().split('Kategori: ')[1].split('\n')[0],
lolos: $$('#content > article').text().split('Lolos moderasi pada: ')[1].split('\n')[0],
cerita: $$('#content > article > p').text()
}
resolve(hasil)
} catch (e) {
reject(e)
}
})
}

const aiCover = async (character, audio) => {
return new Promise(async (resolve, reject) => {
let result = {}
let name = Math.floor(Math.random() * 100000000000000000) + await generateRandomLetters() + '.mp4'
let characters = {
"kobo": 2,
"zeta": 0,
"gura": 20,
"kaela": 4,
"pekora": 6,
"miko": 8,
"subaru": 10,
"korone": 12,
"luna": 14,
"anya": 16,
"reine": 18,
"calli": 22,
"kroni": 24
}
let getCharacter = characters[character]

let send_has_payload = {
"fn_index": getCharacter, "session_hash": "dtniinetjz6"
}
let send_data_payload = {
"fn_index": getCharacter,
"data": [{
"data": "data:audio/mpegbase64," + audio.toString('base64'),
"name": name
},
0,
"pm",
0.6,
false,
"",
"en-US-AnaNeural-Female"
],
"event_data": null,
"session_hash": "dtniinetjz6"
}

const ws = new WebSocket("wss://yanzbotz-waifu-yanzbotz.hf.space/queue/join")
ws.onopen = function() {
console.log("Connected to websocket")
}

ws.onmessage = async function(event) {
let message = JSON.parse(event.data)

switch (message.msg) {
case 'send_hash':
ws.send(JSON.stringify(send_has_payload))
break

case 'estimation':
console.log('Menunggu antrean: ️' + message.rank)
break

case 'send_data':
console.log('Processing your audio....')
ws.send(JSON.stringify(send_data_payload))
break

case 'process_completed':
result.base64 = 'https://yanzbotz-waifu-yanzbotz.hf.space/file=' + message.output.data[1].name
break
}
}

ws.onclose = function(event) {
if (event.code === 1000) {
console.log('Process completed️')
} else {
console.log('Err : WebSocket Connection Error:\n')
}
resolve(result)
}
})
}

class vitsSpeech {
model = (number) => {
return new Promise(async (resolve) => {
let res = await fetch("https://raw.githubusercontent.com/ArifzynXD/database/master/ai/anime.json")
let data = await res.json()
let model = data.model[number.toString()]
resolve(model || data)
})
}
language = (id) => {
return new Promise(async (resolve) => {
let res = await fetch("https://raw.githubusercontent.com/ArifzynXD/database/master/ai/anime.json")
let data = await res.json()
let lang = data.language[id.toString()]
resolve(lang || data)
})
}
generate = (text, model_id, language) => {
return new Promise(async (resolve, reject) => {
let model = await this.model(model_id)
let lang = await this.language(language)
let send_hash = {
"session_hash": "4odx020bres",
"fn_index": 2
}
let send_data = {
"fn_index": 2,
"data": [ text, model, lang, 1, false ],
"session_hash": "4odx020bres"
}
let result = {}
let ws = new WebSocket("wss://plachta-vits-umamusume-voice-synthesizer.hf.space/queue/join")
ws.onopen = function() {
console.log("Connected to websocket")
}
ws.onmessage = async function(event) {
let message = JSON.parse(event.data)
switch (message.msg) {
case 'send_hash':
ws.send(JSON.stringify(send_hash))
break
case 'estimation':
console.log('Menunggu antrean: ️' + message.rank)
break
case 'send_data':
console.log('Processing your audio....')
ws.send(JSON.stringify(send_data))
break
case 'process_completed':
result.url = 'https://plachta-vits-umamusume-voice-synthesizer.hf.space/file=' + message.output.data[1].name
break
}
}
ws.onclose = function(event) {
if (event.code === 1000) {
console.log('Process completed️')
} else {
console.log('Err : WebSocket Connection Error:\n')
}
resolve(result)
}
})
}
}

export { cerpen, hoax, checkWeb, jadwalTV, anime, manga, character, topAnime, topManga, aiCover, vitsSpeech, otakudesu }