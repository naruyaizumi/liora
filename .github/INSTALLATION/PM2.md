# ⚡ Installing Liora with PM2

This document provides a **complete step-by-step guide** to installing and managing **Liora** using **PM2** on a VPS or Dedicated Server.  
Using **PM2** ensures that the bot will run **continuously in the background**, automatically **restart on crashes or server reboots**, and gives you advanced tools for monitoring and maintenance.

---

## 1. Prerequisites

Before installation, make sure your environment is ready:

- **Operating System**: Linux (Debian/Ubuntu recommended), CentOS/RHEL, or equivalent
- **Node.js**: Version **22 or later** is recommended for maximum compatibility with Liora’s libraries
- **Git**: For cloning and updating the source code
- **Build Tools**: Required for native modules like `better-sqlite3`, `sharp`, and `canvas`

### Debian/Ubuntu

apt update && apt install -y \
 build-essential pkg-config cmake \
 python3 python3-dev \
 ffmpeg imagemagick \
 libavformat-dev libavcodec-dev libavutil-dev \
 libswresample-dev libswscale-dev \
 libwebp-dev libpng-dev libjpeg-dev zlib1g-dev \
 libfreetype6-dev libharfbuzz-dev libpango1.0-dev \
 libgif-dev libopus-dev libvpx-dev \
 git curl wget zip unzip

### CentOS/RHEL 7

yum groupinstall -y "Development Tools"
yum install -y epel-release
yum install -y \
 cmake \
 python3 python3-devel \
 ffmpeg ImageMagick \
 libwebp-devel libpng-devel libjpeg-turbo-devel \
 zlib-devel freetype-devel harfbuzz-devel pango-devel giflib-devel \
 opus-devel libvpx-devel \
 git curl wget zip unzip

### CentOS/RHEL 8+

dnf groupinstall -y "Development Tools"
dnf install -y epel-release
dnf install -y \
 cmake \
 python3 python3-devel \
 ffmpeg ImageMagick \
 libwebp-devel libpng-devel libjpeg-turbo-devel \
 zlib-devel freetype-devel harfbuzz-devel pango-devel giflib-devel \
 opus-devel libvpx-devel \
 git curl wget zip unzip

### Install Node.js (Recommended via NodeSource)

curl -fsSL https://deb.nodesource.com/setup_22.x | bash -  
apt install -y nodejs

### Verify Installations

node -v  
npm -v

### Install PM2 Globally

npm install -g pm2

Verify PM2:
pm2 -v

---

## 2. Downloading Liora Source Code

You can either use Git for easier updates, or download the latest release ZIP.

### Option 1: Clone with Git

git clone https://github.com/naruyaizumi/liora.git  
cd liora

### Option 2: Download Release ZIP

1. Go to: [Liora Latest Release](https://github.com/naruyaizumi/liora/releases/latest)
2. Download the ZIP file
3. Upload to your server and extract:

unzip liora.zip -d liora  
cd liora

> 💡 **Tip**: Use Git if you plan to update Liora frequently. ZIP is better for panel-based hosting (like Pterodactyl).

---

## 3. Environment Configuration

Liora uses an `.env` file for configuration.

1. Duplicate the template file:  
   cp .env.example .env

2. Edit `.env` with your preferred editor:  
   nano .env

Fill in values such as:

- **API keys** (for external services)
- **WhatsApp pairing credentials**
- **Owner numbers & newsletter IDs**
- Any custom environment variables

> ⚠️ Always keep your `.env` private and never commit it to GitHub.

---

## 4. Installing Dependencies

Liora requires Node.js dependencies listed in `package.json`.

Install them with:  
npm install

Or use other package managers if preferred:  
yarn install  
pnpm install

> ⚠️ Do not mix package managers. Pick one and stick with it. Mixing may cause broken lockfiles and inconsistent modules.

If you see errors related to **better-sqlite3**, ensure build tools are installed (step 1).

---

## 5. Running Liora with PM2

Start the bot for the first time:  
pm2 start index.js --name "liora"

Save the current PM2 process list so it persists after reboot:  
pm2 save

Enable auto-start on boot:  
pm2 startup

Follow the instructions shown after running `pm2 startup` (copy and paste the command given).

---

## 6. Monitoring & Logs

Check running processes:  
pm2 list

View logs in real-time:  
pm2 logs liora

Inspect CPU & memory usage:  
pm2 monit

---

## 7. Maintenance & Operations

### Restart Bot

pm2 restart liora

### Stop Bot

pm2 stop liora

### Delete Bot Process

pm2 delete liora

### Update Liora (Git Users Only)

git pull origin main  
npm install  
pm2 restart liora

### Update Dependencies

npm update

---

## 8. Troubleshooting

- **Error: better-sqlite3 failed to build**  
  → Ensure `python3`, `make`, and `g++` are installed.

- **Bot doesn’t restart after reboot**  
  → Run:  
   pm2 save && pm2 startup

- **High memory usage**  
  → Use `pm2 monit` to check usage. Consider log rotation:  
   pm2 install pm2-logrotate

- **Session not working**  
  → Delete `auth` folder and re-pair with WhatsApp.

---

## 9. Advanced Features with PM2

- **Log Rotation** (prevents logs from consuming disk space):  
  pm2 install pm2-logrotate

- **Cluster Mode** (for multi-core CPU performance):  
  pm2 start index.js -i max --name "liora"

- **JSON Configuration** (instead of CLI):  
  Create `ecosystem.config.js`:

```javascript
module.exports = {
    apps: [
        {
            name: "liora",
            script: "index.js",
            watch: true,
            max_memory_restart: "512M",
        },
    ],
};
```

Start with:
pm2 start ecosystem.config.js

---

🌸 Conclusion

- By running Liora with PM2, you benefit from:
- Automatic background execution
- Crash recovery and auto-restart
- Log management and monitoring tools
- Easier process control (start/stop/restart)

> Your bot is now ready to pair and operate in a production environment. 🚀
