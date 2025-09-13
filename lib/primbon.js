import * as cheerio from 'cheerio'

const primbon = {
sifatbisnis: async (tgl, bln, thn) => {
return new Promise(async (resolve, reject) => {
try {
let params = new URLSearchParams({
tgl,
bln,
thn,
submit: ' Submit! '
})

let res = await fetch('https://primbon.com/sifat_usaha_bisnis.php', {
method: 'POST',
headers: {
'Content-Type': 'application/x-www-form-urlencoded'
},
body: params
})

let html = await res.text()
let $ = cheerio.load(html)
let fetchText = $('#body').text()
let hasil

try {
hasil = {
status: true,
message: {
hari_lahir: fetchText.split('Hari Lahir Anda: ')[1].split(thn)[0].trim(),
usaha: fetchText.split(thn)[1].split('< Hitung Kembali')[0].trim(),
catatan: 'Setiap manusia memiliki sifat atau karakter yang berbeda-beda dalam menjalankan bisnis atau usaha. Dengan memahami sifat bisnis kita, rekan kita, atau bahkan kompetitor kita, akan membantu kita memperbaiki diri atau untuk menjalin hubungan kerjasama yang lebih baik. Para ahli primbon di tanah Jawa sejak jaman dahulu telah merumuskan karakter atau sifat bisnis seseorang berdasarkan weton hari kelahirannya. Hasil perhitungannya bisa dijadikan referensi untuk memilih bidang usaha atau rekan bisnis yang cocok bagi kita.'
}
}
} catch {
hasil = {
status: false,
message: 'Error, Mungkin Input Yang Anda Masukkan Salah'
}
}

resolve(hasil)
} catch (e) {
reject(e)
}
})
},
rejekihoki: async (tgl, bln, thn) => {
return new Promise(async (resolve, reject) => {
try {
let params = new URLSearchParams({
tgl,
bln,
thn,
submit: ' Submit! '
})

let res = await fetch('https://primbon.com/rejeki_hoki_weton.php', {
method: 'POST',
headers: {
'Content-Type': 'application/x-www-form-urlencoded'
},
body: params
})

let html = await res.text()
let $ = cheerio.load(html)
let fetchText = $('#body').text()
let hasil

try {
hasil = {
status: true,
message: {
hari_lahir: fetchText.split('Hari Lahir: ')[1].split(thn)[0].trim(),
rejeki: fetchText.split(thn)[1].split('< Hitung Kembali')[0].trim(),
catatan: 'Rejeki itu bukan lah tentang ramalan tetapi tentang usaha dan ikhtiar seseorang. From Admin'
}
}
} catch {
hasil = {
status: false,
message: 'Error, Mungkin Input Yang Anda Masukkan Salah'
}
}

resolve(hasil)
} catch (e) {
reject(e)
}
})
},
tanggalnikah: async (tgl, bln, thn) => {
return new Promise(async (resolve, reject) => {
try {
let url = `https://primbon.com/tanggal_jadian_pernikahan.php?tgl=${tgl}&bln=${bln}&thn=${thn}&proses=+Submit%21+`
let res = await fetch(url)
let html = await res.text()
let $ = cheerio.load(html)
let fetchText = $('#body').text()
let hasil

try {
hasil = {
status: true,
message: {
tanggal: fetchText.split('Tanggal: ')[1].split('Karakteristik: ')[0].trim(),
karakteristik: fetchText.split('Karakteristik: ')[1].split('< Hitung Kembali')[0].trim(),
catatan: 'Untuk melihat kecocokan jodoh dengan pasangan, dapat dikombinasikan dengan primbon Ramalan Jodoh (Jawa), Ramalan Jodoh (Bali), numerologi Kecocokan Cinta, tingkat keserasian Nama Pasangan, dan Ramalan Perjalanan Hidup Suami Istri.'
}
}
} catch {
hasil = {
status: false,
message: 'Error, Mungkin Input Yang Anda Masukkan Salah'
}
}

resolve(hasil)
} catch (e) {
reject(e)
}
})
},
kecocokan: async (nama1, nama2) => {
return new Promise(async (resolve, reject) => {
try {
let url = `https://primbon.com/kecocokan_nama_pasangan.php?nama1=${nama1}&nama2=${nama2}&proses=+Submit%21+`
let res = await fetch(url)
let html = await res.text()
let $ = cheerio.load(html)
let fetchText = $("#body").text()
let hasil

try {
hasil = {
status: true,
message: {
nama_anda: nama1,
nama_pasangan: nama2,
sisi_positif: fetchText.split('Sisi Positif Anda: ')[1].split('Sisi Negatif Anda: ')[0].trim(),
sisi_negatif: fetchText.split('Sisi Negatif Anda: ')[1].split('< Hitung Kembali')[0].trim(),
gambar: 'https://primbon.com/ramalan_kecocokan_cinta2.png',
catatan: 'Untuk melihat kecocokan jodoh dengan pasangan, dapat dikombinasikan dengan primbon Ramalan Jodoh (Jawa), Ramalan Jodoh (Bali), numerologi Kecocokan Cinta, Ramalan Perjalanan Hidup Suami Istri, dan makna dari Tanggal Jadian/Pernikahan.'
}
}
} catch {
hasil = {
status: false,
message: 'Error, Mungkin Input Yang Anda Masukkan Salah'
}
}

resolve(hasil)
} catch (e) {
reject(e)
}
})
},
mimpi: async (value) => {
return new Promise(async (resolve, reject) => {
try {
let url = `https://primbon.com/tafsir_mimpi.php?mimpi=${encodeURIComponent(value)}&submit=+Submit+`
let res = await fetch(url)
let html = await res.text()
let $ = cheerio.load(html)
let fetchText = $('#body').text()
let hasil

try {
hasil = {
status: true,
message: {
mimpi: value,
arti: fetchText.split(`Hasil pencarian untuk kata kunci: ${value}`)[1].split('\n')[0].trim(),
solusi: fetchText.split('Solusi -')[1].trim()
}
}
} catch {
hasil = {
status: false,
message: `Tidak ditemukan tafsir mimpi "${value}" Cari dengan kata kunci yang lain.`
}
}

resolve(hasil)
} catch (e) {
reject(e)
}
})
},
artinama: async (value) => {
return new Promise(async (resolve, reject) => {
try {
let url = `https://primbon.com/arti_nama.php?nama1=${encodeURIComponent(value)}&proses=+Submit%21+`
let res = await fetch(url)
let html = await res.text()
let $ = cheerio.load(html)
let fetchText = $('#body').text()
let hasil

try {
hasil = {
status: true,
message: {
nama: value,
arti: fetchText.split('memiliki arti: ')[1].split('Nama:')[0].trim(),
catatan: 'Gunakan juga aplikasi numerologi Kecocokan Nama, untuk melihat sejauh mana keselarasan nama anda dengan diri anda.'
}
}
} catch {
hasil = {
status: false,
message: `Tidak ditemukan arti nama "${value}" Cari dengan kata kunci yang lain.`
}
}

resolve(hasil)
} catch (e) {
reject(e)
}
})
}
}

export { primbon }