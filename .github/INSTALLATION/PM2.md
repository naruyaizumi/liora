# ⚡ Instalasi Liora via PM2

Panduan ini menjelaskan cara menjalankan **Liora** menggunakan **PM2** di VPS/Dedicated Server.  
PM2 dipakai agar bot bisa berjalan **background** dan otomatis **restart** jika crash/server reboot.

---

## 1. Persiapan Server

Pastikan server kamu sudah terpasang:
- Node.js (disarankan v22 atau lebih baru)  
- Git  
- Build tools (Debian/Ubuntu: `apt install -y build-essential python3 g++ make`)  

Install PM2 secara global:
```bash
npm install -g pm2
```

---

## 2. Clone atau Download Source

**Opsi 1: Git Clone**
```bash
git clone https://github.com/naruyaizumi/liora.git
cd liora
```

**Opsi 2: Download Release ZIP**

1. Buka [Download Liora Latest Release](https://github.com/naruyaizumi/liora/releases/latest)

2. Upload ke server dan extract:
```bash
unzip liora.zip -d liora
cd liora
```

---

## 3. Konfigurasi Environment

1. Copy file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```

2. Edit file `.env` sesuai kebutuhan (API key, session, dsb).  
   Bisa gunakan editor seperti `nano`:
```bash
nano .env
```

---

## 4. Install Dependencies

Jalankan perintah berikut untuk menginstall semua package:
```bash
npm install
```

> Jika ingin menggunakan package manager lain:

```bash
yarn install
```
atau
```bash
pnpm install
```

---

## 5. Jalankan Liora dengan PM2

Start bot menggunakan PM2:
```bash
pm2 start index.js --name "liora"
```

Simpan konfigurasi agar tetap jalan setelah reboot:
```bash
pm2 save
pm2 startup
```

---

## 6. Monitoring & Logs

Cek status semua proses:
```bash
pm2 list
```

Lihat log Liora secara real-time:
```bash
pm2 logs liora
```

---

> ✅ **Liora sekarang berjalan menggunakan PM2 dan akan otomatis restart jika crash/reboot.**  
> Silakan lakukan pairing untuk mulai menggunakan bot.

---

### 📝 Catatan

- Gunakan Node.js 22+ agar kompatibel dengan library terbaru.
- PM2 mendukung fitur auto-restart, monitoring, dan log rotate.
```