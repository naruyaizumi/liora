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

Built on Baileys • Powered by Bun Runtime • Written in JavaScript

---

## 🚀 Overview

Liora is an enterprise-ready WhatsApp bot framework designed for developers who demand **performance**, **reliability**, and **scalability**. Built with modern technologies and battle-tested architecture patterns.

### 🏗️ Architecture Overview

```mermaid
graph TD
    A[WhatsApp Messages<br/><sub>Input Stream</sub>] -->|WebSocket<br/>TLS 1.3| B[Baileys Client<br/><sub>Core Engine</sub>]
    
    B --> C[Message Handler<br/><sub>Middleware Layer</sub>]
    
    subgraph "Processing Pipeline"
        C --> D{Command Parser<br/><sub>Decision Node</sub>}
        D -->|Valid Command| E[Plugin Manager<br/><sub>Registry & Loader</sub>]
        D -->|System Message| F[System Handler<br/><sub>Internal Services</sub>]
    end
    
    E --> G((Plugin Executor<br/><sub>Runtime Environment</sub>))
    
    subgraph "Data Layer"
        H[(SQLite Database<br/><sub>Persistence Store</sub>)]
    end
    
    G --> I[Response Handler<br/><sub>Output Formatter</sub>]
    F --> I
    C --> H
    E --> H
    
    I -->|API Response| B
    
    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:3px,color:#0d47a1
    style B fill:#f1f8e9,stroke:#558b2f,stroke-width:3px,color:#1b5e20
    style C fill:#fff3e0,stroke:#ef6c00,stroke-width:3px,color:#e65100
    style D fill:#fce4ec,stroke:#ad1457,stroke-width:3px,color:#880e4f,stroke-dasharray: 5 5
    style E fill:#e8f5e9,stroke:#2e7d32,stroke-width:3px,color:#1b5e20
    style F fill:#e8eaf6,stroke:#283593,stroke-width:3px,color:#1a237e
    style G fill:#fff8e1,stroke:#ff8f00,stroke-width:3px,color:#ff6f00
    style H cylinder,fill:#fafafa,stroke:#424242,stroke-width:3px,color:#212121
    style I fill:#e0f7fa,stroke:#006064,stroke-width:3px,color:#004d40
    
    linkStyle default stroke:#616161,stroke-width:2px
    linkStyle 0 stroke:#1976d2,stroke-width:3px
    linkStyle 6 stroke:#558b2f,stroke-width:3px
```

### ✨ Key Features

<table>
<tr>
<td align="center" width="33%">

**⚡ Performance**

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/High%20Voltage.png" width="50" />

Ultra-fast Bun runtime
<br>3x faster than Node.js
<br>Minimal dependencies

</td>
<td align="center" width="33%">

**🎯 Architecture**

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Gear.png" width="50" />

ESM-first design
<br>Plugin-based system
<br>Clean codebase

</td>
<td align="center" width="33%">

**💾 Database**

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/File%20Folder.png" width="50" />

Native bun:sqlite
<br>No external services
<br>Lightweight storage

</td>
</tr>
<tr>
<td align="center" width="33%">

**🌐 Deployment**

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Globe%20Showing%20Europe-Africa.png" width="50" />

Server ready
<br>Container support
<br>Pterodactyl compatible

</td>
<td align="center" width="33%">

**🎨 Rich Media**

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Artist%20Palette.png" width="50" />

Interactive buttons
<br>Carousels & albums
<br>Stories support

</td>
<td align="center" width="33%">

**🔐 Security**

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Locked.png" width="50" />

Pairing code auth
<br>Owner-only commands
<br>Command blocking

</td>
</tr>
</table>

### 🔄 Message Flow

```mermaid
sequenceDiagram
    participant U as User
    participant WA as WhatsApp Server
    participant B as Baileys Client
    participant H as Message Handler
    participant P as Plugin System
    participant DB as Database
    participant C as Cache
    participant L as Logger

    Note over U,WA: User Interaction Phase
    U->>WA: Send Message (Text/Media)
    WA->>B: WebSocket Event (Encrypted)
    
    Note over B,H: Processing Phase
    B->>L: Log Incoming Message
    B->>H: Decode & Parse Message
    H->>C: Check Rate Limit
    C-->>H: Allow/Block
    H->>DB: Validate User Session
    DB-->>H: Session Data
    H->>H: Extract Command & Args
    
    alt Valid Command
        H->>DB: Check User Permissions
        DB-->>H: Permission Level
        H->>P: Load Plugin
        P->>DB: Query/Update Data
        P->>P: Process Logic
        P->>H: Response Data
        
        Note over H,B: Response Phase
        H->>H: Format Response
        H->>L: Log Action
        H->>B: Prepared Message
        B->>WA: Send via WebSocket
        WA->>U: Deliver Response
        
    else Invalid/No Command
        H->>H: System Handler
        H->>B: Default Response
        B->>WA: Send via WebSocket
        WA->>U: Deliver Response
    end
    
    Note right of DB: Data Persistence
    DB->>DB: Commit Transaction
    L->>L: Archive Logs
    C->>C: Cleanup Expired
```

---

## 📸 Screenshots

### Interactive Menus

<p align="center">
  <img src="https://files.catbox.moe/dqx3qt.jpg" width="400" alt="Main Menu"><br>
  <em>Main menu interface with options</em>
</p>

<p align="center">
  <img src="https://files.catbox.moe/t3aeaj.jpg" width="400" alt="Category Menu"><br>
  <em>Category menu for easier navigation</em>
</p>

### Rich Media Support

<p align="center">
  <img src="https://files.catbox.moe/ulm6qc.jpg" width="270" alt="Carousels"><br>
  <em>Carousel view for multiple items with interactive buttons</em>
</p>

---

## ⚡ Quick Start

For detailed installation instructions, see **[INSTALLATION.md](.github/INSTALLATION.md)**

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

See **[INSTALLATION.md](.github/INSTALLATION.md)** for comprehensive manual installation guide.

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

| Command           | Description          | Example |
| ----------------- | -------------------- | ------- |
| `.menu` / `.help` | Display command menu | `.menu` |
| `.ping`           | Check bot latency    | `.ping` |

### Interacting with the Bot

- **Main Menu**: Send `.menu` or `.help`
- **Category Menu**: Select category from button menu
- **Direct Command**: Use prefix + command name

---

## 🔌 Plugin System

### Plugin Structure

```
src/plugins/
├── info/              # Information commands
│   └── info-ping.js
├── owner/             # Owner-only commands
│   ├── owner-sf.js    # Save file
│   ├── owner-df.js    # Delete file
│   ├── owner-gf.js    # Get file
│   └── owner-reload.js
├── group/             # Group management
├── downloader/        # Media downloaders
├── ai/                # AI features
└── tool/              # Utility tools
```

### Creating a Basic Plugin

Create a file in `/src/plugins/[category]/[name].js`:

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

### Plugin Properties

- `handler.help` - Command names for help menu
- `handler.tags` - Category tags
- `handler.command` - RegExp pattern for command matching
- `handler.owner` - Owner-only command (optional)
- `handler.premium` - Premium-only command (optional)
- `handler.group` - Group-only command (optional)
- `handler.admin` - Admin-only command (optional)

### Learn More

- **[PLUGINS.md](.github/PLUGINS.md)** - Complete plugin development guide
- **[BUTTONS.md](.github/BUTTONS.md)** - Interactive buttons & rich media
- **[API.md](.github/API.md)** - API integration & utilities

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

- **[INSTALLATION.md](.github/INSTALLATION.md)** - Detailed installation guide
- **[PLUGINS.md](.github/PLUGINS.md)** - Plugin development guide
- **[BUTTONS.md](.github/BUTTONS.md)** - Interactive buttons & carousels
- **[API.md](.github/API.md)** - API utilities & helpers
- **[Contributing Guidelines](.github/CONTRIBUTING.md)** - How to contribute
- **[Security Policy](.github/SECURITY.md)** - Report vulnerabilities
- **[Code of Conduct](.github/CODE_OF_CONDUCT.md)** - Community standards

---

## 🤝 Contributing

<div align="center">

**Contributions are welcome!** 💖

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for details.

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

Licensed under the **Apache License 2.0**. See [LICENSE](LICENSE) for full details.

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