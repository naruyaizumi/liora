<div align="center">

<!-- Wave Header with Typing Animation -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=200&section=header&text=Liora%20Bot&fontSize=80&fontAlignY=35&animation=twinkling&fontColor=fff&desc=Enterprise-Grade%20WhatsApp%20Bot%20Framework&descAlignY=55&descSize=18" width="100%" />

![Liora Banner](https://files.catbox.moe/3xv7p0.png)

# 🌸 Liora

### Modern WhatsApp Bot Framework built on Baileys

<p align="center">
  <a href="https://bun.sh">
    <img src="https://img.shields.io/badge/Bun-%3E=1.3.2-black?style=for-the-badge&logo=bun&logoColor=white" alt="bun">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-Apache%202.0-blue?style=for-the-badge&logo=apache&logoColor=white" alt="license">
  </a>
  <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules">
    <img src="https://img.shields.io/badge/ESM-Modules-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="esm">
  </a>
  <a href="https://www.sqlite.org/index.html">
    <img src="https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="sqlite">
  </a>
</p>

---

</div>

**Production-Grade WhatsApp Bot Framework**

Built on Baileys • Powered by Bun Runtime • Written in JavaScript

---

## 🚀 Overview

Liora is an enterprise-ready WhatsApp bot framework designed for developers who demand **performance**, **reliability**, and **scalability**. Built with modern technologies and battle-tested architecture patterns.

### ✨ Key Features

| Feature                     | Description                                                     |
|------------------------------|-----------------------------------------------------------------|
| ⚡ **Bun Runtime**           | Ultra-fast JavaScript execution, up to 3x faster than Node.js   |
| 🎯 **Modern Architecture**   | ESM-first design with clean codebase                             |
| 💾 **Lightweight Database**   | Native `bun:sqlite`, no external services                       |
| 📦 **Zero Bloat**            | Minimal dependencies for production                             |
| 🌐 **Deploy Anywhere**       | Server, Pterodactyl, or containerized                           |
| 🎨 **Rich Media**            | Buttons, carousels, albums, and stories support                 |
| 🔌 **Plugin System**         | Easy-to-extend modular architecture                              |
| 🔐 **Pairing Code**          | No QR scanning needed                                            |
| 🧩 **Modular Architecture**  | Plugin-based design pattern for easy extensibility              |
| 💎 **Zero Config**           | Works out of the box with sensible defaults                     |
| 🎨 **Clean Code**            | Modern ESM, type-safe patterns, and best practices              |

---

## 📸 Screenshots

### Interactive Menus
<div align="center">
  <img src="https://files.catbox.moe/dqx3qt.jpg" width="400" alt="Main Menu">
  <img src="https://files.catbox.moe/t3aeaj.jpg" width="400" alt="Category Menu">
</div>

### Rich Media Support
<div align="center">
  <img src="https://files.catbox.moe/bqgvwe.jpg" width="270" alt="Buttons">
  <img src="https://files.catbox.moe/ulm6qc.jpg" width="270" alt="Carousels">
  <img src="https://files.catbox.moe/jjmlvd.jpg" width="270" alt="Ping Command">
</div>


---

## ⚡ Quick Start

### Automated Installation for Linux (Ubuntu/Debian)

```bash
curl -fsSL https://raw.githubusercontent.com/naruyaizumi/liora/main/install.sh | bash
```

**Post-installation:**

```bash
bot config  # Configure settings
bot start   # Start the bot
bot log     # View logs
bot status  # Check status
```

### Manual Installation

#### 1. Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
bun --version
```

#### 2. Setup Project

```bash
git clone https://github.com/naruyaizumi/liora.git
cd liora
bun install
cp .env.example .env
nano .env  # Configure your settings
```

#### 3. Run the Bot

```bash
# Production
bun start
```

---

## ⚙️ Configuration

### Environment Setup

Edit `.env` with your configuration:

```bash
# Staff Configuration (WhatsApp LIDs)
OWNERS=["1234567890","1234567890"]

# Pairing Configuration
PAIRING_NUMBER=1234567890
PAIRING_CODE=CUMICUMI

# Bot Metadata
WATERMARK=Liora
AUTHOR=Naruya Izumi
THUMBNAIL_URL=https://

# Logger Configuration
LOG_LEVEL=info
LOG_PRETTY=true
BAILEYS_LOG_LEVEL=silent
```

**Important Notes:**
- Use WhatsApp **LIDs** (Local IDs), not phone numbers for OWNERS
- `PAIRING_NUMBER` must be in international format without `+` or spaces
- `PAIRING_CODE` should be 8 alphanumeric characters (auto-generated if empty)

### Pairing Your Device

1. Run the bot: `bun start`
2. Open WhatsApp on your phone
3. Go to **Linked Devices** > **Link a Device**
4. Enter the pairing code displayed in console
5. Done! Your bot is now connected

---

## 🎮 Usage

### Command Prefixes

Liora supports multiple prefixes:

```
.menu    # Dot prefix
!menu    # Exclamation
/menu    # Slash
```

### Built-in Commands

| Command | Description | Example |
|---------|-------------|---------|
| `.menu` / `.help` | Display command menu | `.menu` |
| `.ping` | Check bot latency | `.ping` |

### Interacting with the Bot

- **Main Menu**: Send `.menu` or `.help`
- **Category Menu**: Select category from button menu
- **Direct Command**: Use prefix + command name

---

## 🔌 Plugin System

### Creating a Plugin

Plugins are located in `/src/plugins/` with category-based folders.

**Example Plugin:** `/src/plugins/info/info-ping.js`

```javascript
/**
 * @file Ping command handler
 * @module plugins/info/ping
 * @license Apache-2.0
 * @author Naruya Izumi
 */

let handler = async (m, { conn }) => {
    const start = Bun.nanoseconds();
    const msg = await conn.sendMessage(m.chat, { text: "⏱️ Checking..." });
    const ns = Bun.nanoseconds() - start;
    const ms = (ns / 1_000_000).toFixed(0);
    
    await conn.sendMessage(m.chat, {
        text: `🏓 Pong! ${ms} ms`,
        edit: msg.key,
    });
};

handler.help = ["ping"];
handler.tags = ["info"];
handler.command = /^(ping)$/i;

export default handler;
```

### Plugin Structure

```
src/plugins/
├── info/              # Information commands
│   └── info-ping.js
├── owner/             # Owner-only commands
├── group/             # General commands
└── tool/             # Utility tools
```

### Plugin Properties

- `handler.help` - Command names for help menu
- `handler.tags` - Category tags
- `handler.command` - RegExp pattern for command matching
- `handler.owner` - Owner-only command (optional)
- `handler.premium` - Premium-only command (optional)

---

## 🚀 Production Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start ecosystem.config.js

# Save configuration
pm2 save

# Enable startup
pm2 startup

# Monitor
pm2 monit
```

### Using Systemd

Service file auto-created by installer at `/etc/systemd/system/liora.service`

```bash
sudo systemctl start liora
sudo systemctl enable liora
sudo systemctl status liora
```

---

## 📚 Documentation

- **[Contributing Guidelines](.github/CONTRIBUTING.md)** - How to contribute
- **[Security Policy](.github/SECURITY.md)** - Report vulnerabilities
- **[Code of Conduct](.github/CODE_OF_CONDUCT.md)** - Community standards

---

## 🤝 Contributing

<div align="center">

**Contributions are welcome!** 💖

All types of contributions are valuable - bug fixes, features, docs, or feedback.

We welcome contributions! See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for details.

</div>

### 📝 How to Contribute

```bash
# 1. Fork & Clone
git clone https://github.com/YOUR_USERNAME/liora.git
cd liora

# 2. Create Branch
git checkout -b feature/YourFeature

# 3. Make Changes
# - Follow code style
# - Test changes
# - Update docs
```

### 🚀 Submit Changes

```bash
# 4. Commit & Push
git commit -m "✨ Add YourFeature"
git push origin feature/YourFeature

# 5. Open Pull Request
# - Describe changes
# - Link issues
# - Wait for review
```

### 📋 Pull Request Checklist

- [ ] Code follows the project's style guidelines
- [ ] Tests added/updated and passing
- [ ] Documentation updated (if applicable)
- [ ] Commit messages are clear and descriptive
- [ ] Branch is up to date with main/master

<div align="center">

### 🌟 Top Contributors

<a href="https://github.com/naruyaizumi/liora/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=naruyaizumi/liora" alt="Contributors" />
</a>

</div>

---

## 💬 Community

<div align="center">

**Join our growing community!**

<table>
<tr>
<td align="center" width="50%">

**💭 WhatsApp Group**

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Bell.png" width="50" />

Ask questions, share ideas,
and get help from community

<br><br>

[![Join Group](https://img.shields.io/badge/Join-Group-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://chat.whatsapp.com/FtMSX1EsGHTJeynu8QmjpG)

</td>
<td align="center" width="50%">

**📡 Baileys Community**

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Satellite%20Antenna.png" width="50" />

Official Baileys developer hub
on Discord

<br><br>

[![Join Discord](https://img.shields.io/badge/Join-Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/baileys)

</td>
</tr>
</table>

</div>

## 🔒 Security

**Report vulnerabilities to:** liora.bot.official@gmail.com

> [!WARNING]
> **DO NOT** report security issues through public GitHub issues.

See [SECURITY.md](.github/SECURITY.md) for our security policy.

---

## 📄 License

Licensed under the **Apache License 2.0**

**You are free to:**
- ✅ Use commercially
- ✅ Modify the source
- ✅ Distribute
- ✅ Sublicense

**You must:**
- 📝 Include original copyright
- 📝 Include Apache License 2.0
- 📝 State changes made
- 📝 Include NOTICE file

See [LICENSE](LICENSE) for full details.

> [!CAUTION]
> Removing copyright notices or claiming original authorship violates the license and may result in legal action.

---

## 💖 Acknowledgments

**Built with passion by developers, for developers**

### 🚀 Core Technologies

<p align="left">
  <a href="https://bun.sh">
    <img src="https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white" alt="Bun" />
  </a>
  <a href="https://github.com/WhiskeySockets/Baileys">
    <img src="https://img.shields.io/badge/Baileys-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Baileys" />
  </a>
  <a href="https://www.javascript.com/">
    <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  </a>
  <a href="https://www.sqlite.org/">
    <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  </a>
</p>

### 🛠️ Development Tools

<p align="left">
  <a href="https://eslint.org/">
    <img src="https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white" alt="ESLint" />
  </a>
  <a href="https://prettier.io/">
    <img src="https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=black" alt="Prettier" />
  </a>
  <a href="https://codeql.github.com/">
    <img src="https://img.shields.io/badge/CodeQL-2F4F4F?style=for-the-badge&logo=github&logoColor=white" alt="CodeQL" />
  </a>
  <a href="https://github.com/features/actions">
    <img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" alt="GitHub Actions" />
  </a>
</p>

### 🤖 AI Assistants

Special thanks to AI assistants that helped in development:

<p align="left">
  <a href="https://openai.com/chatgpt">
    <img src="https://img.shields.io/badge/ChatGPT-74aa9c?style=for-the-badge&logo=openai&logoColor=white" alt="ChatGPT" />
  </a>
  <a href="https://github.com/features/copilot">
    <img src="https://img.shields.io/badge/GitHub_Copilot-000000?style=for-the-badge&logo=github&logoColor=white" alt="Copilot" />
  </a>
  <a href="https://gemini.google.com/">
    <img src="https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white" alt="Gemini" />
  </a>
  <a href="https://claude.ai/">
    <img src="https://img.shields.io/badge/Claude-181818?style=for-the-badge&logo=anthropic&logoColor=white" alt="Claude" />
  </a>
</p>

### 🙏 Community & Contributors

- 💚 All [contributors](https://github.com/naruyaizumi/liora/graphs/contributors) who made this possible
- 🌍 The amazing open-source community
- ⭐ Everyone who starred this repository
- 🐛 Bug reporters and feature requesters

---

<div align="center">

  <!-- Repobeats Analytics -->
  <p><strong>📊 RepoBeats Analytics</strong></p>
  <img src="https://repobeats.axiom.co/api/embed/80e8d22ce1b99e5cdc62a986f74bbac8f9e2ed5b.svg" width="700" alt="Repobeats Analytics"/>

  <!-- Star History -->
  <p><strong>🌟 Star History</strong></p>
  <a href="https://star-history.com/#naruyaizumi/liora&Date">
    <img src="https://api.star-history.com/svg?repos=naruyaizumi/liora&type=Date" width="700" alt="Star History Chart"/>
  </a>

  <hr/>

  <p><strong>Maintained by the Liora community || <a href="https://github.com/naruyaizumi">© 2024 - 2026 Naruya Izumi</a></strong></p>
  
<br/><br/>

  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=120&section=footer&text=Thank%20You!&fontSize=40&fontColor=ffffff&animation=twinkling&fontAlignY=75" width="100%" alt="Footer"/>

</div>