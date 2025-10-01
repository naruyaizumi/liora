# 🚀 Instalasi Liora via Pterodactyl

Panduan ini menjelaskan cara menjalankan **Liora** di panel **Pterodactyl**.  
Karena Pterodactyl biasanya tidak mendukung `git clone` secara langsung, maka instalasi dilakukan melalui **ZIP release**.

---

## 1. Unduh Release Terbaru

1. Buka halaman **last release** Liora:  
   👉 [Download Liora Latest Release](https://github.com/naruyaizumi/liora/releases/latest)
2. Unduh file ZIP source code.

---

## 2. Upload ke Pterodactyl

1. Masuk ke panel **Pterodactyl** kamu.
2. Pilih server Node.js yang sudah dibuat.
3. Buka menu **Files** → klik **Upload** → unggah file ZIP Liora yang sudah didownload.
4. Setelah selesai, **Extract/Unarchive** file ZIP di dalam panel.

---

## 3. Konfigurasi Environment

1. Cari file `.env.example` di dalam folder hasil extract.
2. Edit file tersebut sesuai kebutuhan (isi API key, session, dsb).
3. **Save**, lalu **rename** file menjadi:

```
.env
```

---

## 4. Setup Startup Command

> Karena ada dependensi native (`gyp`), kita perlu install package terlebih dahulu.

1. Masuk ke **Startup** di panel server.
2. Ubah startup command default dari:

```
npm start
```

menjadi:

```
npm install
```

3. Simpan perubahan.

---

## 5. Gunakan Egg Node.js Rekomendasi

Untuk pengalaman terbaik, gunakan Egg Node.js yang sudah saya siapkan:  
👉 [Egg Node.js (20/22/23/24, Complete Tools)](https://gist.github.com/naruyaizumi/12a3c6baed67ca7fd7eaa11992c82631)

Egg ini berbasis **Debian 13 Slim** dengan installer yang sudah include tool penting agar **Liora** bisa berjalan mulus.

- Mendukung `yarn` & `pnpm`
- Sudah terpasang **build tools** untuk modul native (`sharp`, `gyp`, dll)
- Cocok untuk script modern seperti Liora

---

## 6. Install Dependencies

1. Pergi ke **Console**.
2. Jalankan server → proses `npm install` akan berjalan otomatis.
3. Tunggu sampai semua package selesai terpasang.

---

## 7. Jalankan Liora

1. Setelah instalasi selesai, kembali ke **Startup**.
2. Ubah command dari:

```
npm install
```

menjadi:

```
npm start
```

3. Simpan perubahan.
4. Balik ke **Console** lalu jalankan server.

✅ **Liora sekarang siap pairing!**

---

### 📝 Catatan

- Pastikan kamu menggunakan **Egg rekomendasi** agar semua dependensi dapat terpasang dengan baik.
- Jika ingin menggunakan `yarn` atau `pnpm`, pastikan kamu ganti perintah `npm install` sesuai dengan package manager yang dipilih.
