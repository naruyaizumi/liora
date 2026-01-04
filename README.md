<div align="center">

<!-- Wave Header with Typing Animation -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=200&section=header&text=Liora%20Bot&fontSize=80&fontAlignY=35&animation=twinkling&fontColor=fff&desc=Enterprise-Grade%20WhatsApp%20Bot%20Framework&descAlignY=55&descSize=18" width="100%" />

![Liora Banner](https://files.catbox.moe/3xv7p0.png)

**Built on Baileys • Powered by Node.js & Bun**

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">

</div>

## 🎯 Why Liora?

<div align="center">

**Liora** is not just another WhatsApp bot—it's a **production-ready framework** designed for developers who demand **performance**, **reliability**, and **scalability**. Built with modern technologies and battle-tested architecture patterns.

**🚀 Pure JavaScript** • **⚡ PostgreSQL Sessions** • **💾 Redis Caching** • **📦 SQLite Local DB**

</div>

<div align="center">
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">
</div>

## ⚠️ Important Notices

<div align="center">

<table>
<tr>
<td width="33%" align="center">

**🚨 Warning!**

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Symbols/Warning.png"
width="60" />

This project is for educational purposes only. Selling or claiming copyright is strictly prohibited.

</td>
<td width="33%" align="center">

**🛡 Security**

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Shield.png"
width="60" />

Found a vulnerability? **Do not** disclose publicly. Report responsibly through our security policy.

[Security Policy →](.github/SECURITY.md)

</td>
<td width="33%" align="center">

**⚖️ License**

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Scroll.png"
width="60" />

Apache 2.0 allows free use with attribution. **Do not** remove credits or rebrand for profit.

[Read License →](LICENSE)

</td>
</tr>
</table>

</div>

<div align="center">
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">
</div>

## 🏗️ Architecture

<div align="center">

<table>
<tr>
<td width="25%" align="center">

**📝 Pure JavaScript**

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Laptop.png" width="60" />

100% JavaScript codebase
No native bindings
Easy to maintain & debug

</td>
<td width="25%" align="center">

**🔐 PostgreSQL**

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Locked.png" width="60" />

Session & Auth storage
Multi-device support
ACID compliance

</td>
<td width="25%" align="center">

**⚡ Redis**

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Fire.png" width="60" />

Chat data caching
Real-time messaging
High-speed performance

</td>
<td width="25%" align="center">

**💾 SQLite**

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/File%20Folder.png" width="60" />

Local user database
Zero-config setup
Embedded storage

</td>
</tr>
</table>

</div>

<div align="center">
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">
</div>

## 🚀 Quick Start

<div align="center">

### ⚡ One-Line Installation (Systemd)

**Recommended for production deployment with auto-restart**

```bash
curl -fsSL https://raw.githubusercontent.com/naruyaizumi/liora/main/install.sh | bash
```

After installation:
```bash
# Configure bot
bot config

# Start bot
bot start

# View logs
bot log

# Check status
bot status
```

---

### 📦 Manual Installation

</div>

#### Install System Dependencies

```bash
# Update system
sudo apt-get update

# Install required packages
sudo apt-get install -y \
    ffmpeg \
    build-essential \
    python3 \
    git \
    curl \
    wget \
    postgresql \
    redis-server
```

#### Install Bun (Required)

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Load Bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Verify installation
bun --version
```

#### Install Node.js via NVM

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js v24
nvm install 24
nvm use 24
nvm alias default 24

# Verify installation
node -v
npm -v
```

#### Setup PostgreSQL

```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE USER liora WITH PASSWORD 'your_password_here';
CREATE DATABASE liora OWNER liora;
GRANT ALL PRIVILEGES ON DATABASE liora TO liora;
EOF
```

#### Setup Redis

```bash
# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis
redis-cli ping
# Should return: PONG
```

#### Clone & Configure

```bash
# Clone repository
git clone https://github.com/naruyaizumi/liora.git
cd liora

# Create .env file
cat > .env <<EOF
# Bot Configuration
OWNERS=[]
PAIRING_NUMBER=6281234567890
PAIRING_CODE=CUMICUMI

# Bot Metadata
WATERMARK=Liora
AUTHOR=Naruya Izumi
THUMBNAIL_URL=https://qu.ax/DdwBH.jpg

# Logger
LOG_LEVEL=info
LOG_PRETTY=true
LOG_COLORIZE=true

# Database (PostgreSQL)
DATABASE_URL=postgresql://liora:your_password_here@localhost:5432/liora

# Redis
REDIS_URL=redis://localhost:6379
EOF

# Edit configuration
nano .env
```

#### Install Dependencies

```bash
bun install
```

#### Run the Bot

**Option A: Direct Run**
```bash
bun start
```

**Option B: Using PM2 (Recommended for Production)**

```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js <<'EOF'
module.exports = {
  apps: [{
    name: 'liora',
    script: './src/index.js',
    interpreter: 'bun',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Enable PM2 startup
pm2 startup

# View logs
pm2 logs liora

# Monitor
pm2 monit

# Other PM2 commands
pm2 status           # Check status
pm2 restart liora    # Restart bot
pm2 stop liora       # Stop bot
pm2 delete liora     # Remove from PM2
```

<div align="center">

---

### 🎮 PM2 Management Commands

<table>
<tr>
<td width="50%">

**Basic Commands**
```bash
pm2 start ecosystem.config.js
pm2 stop liora
pm2 restart liora
pm2 delete liora
pm2 logs liora
```

</td>
<td width="50%">

**Monitoring**
```bash
pm2 status
pm2 monit
pm2 describe liora
pm2 logs liora --lines 100
pm2 flush
```

</td>
</tr>
</table>

---

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Hand%20gestures/Backhand%20Index%20Pointing%20Down.png" width="40" />

**Minimum Requirements**

<table>
<tr>
<td width="50%">

**System**

- **OS**: Linux (Ubuntu, Debian)
- **Architecture**: x86_64
- **Bun**: v1.3.x (required)
- **Node.js**: v24.x
- **PostgreSQL**: 16+
- **Redis**: 7+

</td>
<td width="50%">

**Hardware**

- **CPU**: 2 cores minimum
- **RAM**: 4GB minimum
- **Storage**: 10GB SSD recommended
- **Network**: Stable internet connection

</td>
</tr>
</table>

</div>

<div align="center">
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">
</div>

## 📊 Project Statistics

<div align="center">

**📈 Project Activity Insights**
Get a visual overview of recent contributions, issues, and PRs.

![Alt](https://repobeats.axiom.co/api/embed/80e8d22ce1b99e5cdc62a986f74bbac8f9e2ed5b.svg "Repobeats analytics image")

**🌟 Star Growth**
Track how Liora's popularity has evolved over time.

<a href="https://star-history.com/#naruyaizumi/liora&Date">
  <img src="https://api.star-history.com/svg?repos=naruyaizumi/liora&type=Date&theme=dark" width="100%" alt="Star History Chart"/>
</a>

</div>

<div align="center">
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">
</div>

<div align="center">

**✨ Sponsorship & Support**

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Glowing%20Star.png" width="60" />

If Liora makes your life easier and you'd like to support its continued development, consider:

<table>
<tr>
<td align="center" width="33%">

**⭐ Give a Star**<br>
The simplest way to show support

</td>
<td align="center" width="33%">

**💬 Share Feedback**<br>
Report issues or suggest features

</td>
<td align="center" width="33%">

**🍴 Fork & Contribute**<br>
Help improve Liora for everyone

</td>
</tr>
</table>

**🏆 Made with 💖 by [Naruya Izumi](https://github.com/naruyaizumi)**

**Copyright © 2024 Naruya Izumi**<br>
Maintained by the Liora community

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,14,18,20,24&height=100&section=footer" width="100%" />

</div>