<div align="center">

<!-- Wave Header with Typing Animation -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=200&section=header&text=Liora%20Bot&fontSize=80&fontAlignY=35&animation=twinkling&fontColor=fff&desc=Enterprise-Grade%20WhatsApp%20Bot%20Framework&descAlignY=55&descSize=18" width="100%" />

![Liora Banner](https://files.catbox.moe/3xv7p0.png)

_🌸 Liora_

**Modern WhatsApp Bot Framework built on Baileys**

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

<!-- Wave Footer Divider -->
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">

</div>

Built on Baileys • Powered by Bun Runtime • Written in JavaScript

<!-- Wave Footer Divider -->
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">

_🚀 Overview_

Liora is an enterprise-ready WhatsApp bot framework designed for developers who demand **performance**, **reliability**, and **scalability**. Built with modern technologies and battle-tested architecture patterns.

**🏗️ Architecture Overview**

```mermaid
graph TD
    A[WhatsApp Messages<br/><sub>User Input Stream</sub>] -->|WebSocket Connection<br/>TLS 1.3| B[Baileys Client<br/><sub>Multi-Device Protocol</sub>]
    B --> C[Message Handler<br/><sub>Middleware Processor</sub>]
    C --> D{Command Parser<br/><sub>Pattern Matching</sub>}
    D -->|Valid Command| E[Plugin Manager<br/><sub>Registry & Loader</sub>]
    D -->|System Message| F[System Handler<br/><sub>Internal Processing</sub>]
    D -->|Media Content| G[Media Processor<br/><sub>Encoding/Decoding</sub>]

    E --> H((Plugin Executor<br/><sub>Runtime Sandbox</sub>))
    H --> I[Response Handler<br/><sub>Output Formatter</sub>]
    F --> I
    G --> I

    C --> J[Database Layer<br/><sub>Persistence Store</sub>]
    J --> K[(SQLite Auth<br/>Session Storage)]
    J --> L[(SQLite Data<br/>User Data)]
    J --> M[(SQLite Cache<br/>Temporary Store)]

    E --> N[Dynamic Plugin Loader<br/><sub>Hot Reload System</sub>]
    N --> O[Plugin Registry<br/><sub>Version Control</sub>]
    N --> P[Permission Manager<br/><sub>Access Control</sub>]

    I -->|Send Response| B

    style A fill:#e3f2fd,stroke:#2196f3,stroke-width:3px,color:#0d47a1
    style B fill:#e8f5e9,stroke:#4caf50,stroke-width:3px,color:#1b5e20
    style C fill:#fff3e0,stroke:#ff9800,stroke-width:3px,color:#e65100
    style D fill:#f5f5f5,stroke:#616161,stroke-width:2px,color:#424242
    style E fill:#f3e5f5,stroke:#9c27b0,stroke-width:3px,color:#4a148c
    style F fill:#e8eaf6,stroke:#3f51b5,stroke-width:3px,color:#1a237e
    style G fill:#e0f2f1,stroke:#00695c,stroke-width:3px,color:#004d40
    style H fill:#fff8e1,stroke:#ff8f00,stroke-width:3px,color:#ff6f00
    style I fill:#fce4ec,stroke:#e91e63,stroke-width:3px,color:#880e4f
    style J fill:#efebe9,stroke:#795548,stroke-width:3px,color:#3e2723
    style K fill:#d7ccc8,stroke:#5d4037,stroke-width:2px,color:#3e2723
    style L fill:#d7ccc8,stroke:#5d4037,stroke-width:2px,color:#3e2723
    style M fill:#d7ccc8,stroke:#5d4037,stroke-width:2px,color:#3e2723
    style N fill:#ffecb3,stroke:#ffa000,stroke-width:3px,color:#ff6f00
    style O fill:#ffecb3,stroke:#ffa000,stroke-width:2px,color:#ff6f00
    style P fill:#ffecb3,stroke:#ffa000,stroke-width:2px,color:#ff6f00

    linkStyle default stroke:#666,stroke-width:2px
    linkStyle 0 stroke:#2196f3,stroke-width:3px
    linkStyle 13 stroke:#e91e63,stroke-width:3px
```

**✨ Key Features**

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

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Video%20Camera.png" width="50" />

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

**Message Flow**

```mermaid
sequenceDiagram
    participant U as User
    participant WA as WhatsApp Server
    participant B as Baileys Client
    participant H as Message Handler
    participant P as Plugin System
    participant DB as Database
    participant C as Cache

    U->>WA: Send Message
    WA->>B: WebSocket Event
    B->>H: Parse Message
    H->>C: Check Rate Limit
    C-->>H: Allow/Deny
    H->>DB: Validate Session
    DB-->>H: Session Data
    H->>DB: Check Permissions
    DB-->>H: Permission Level
    H->>H: Match Command
    H->>P: Execute Plugin
    P->>DB: Query Data
    DB-->>P: Result Set
    P->>P: Process Logic
    P->>H: Response Data
    H->>B: Format Message
    B->>WA: Send Response
    WA->>U: Deliver Message
```

<!-- Wave Footer Divider -->
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">

_⚡ Quick Start_

For detailed installation instructions, see **[INSTALLATION.md](.github/INSTALLATION.md)**

**Automated Installation for Linux (Ubuntu/Debian)**

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

**Manual Installation**

See **[INSTALLATION.md](.github/INSTALLATION.md)** for comprehensive manual installation guide.

<!-- Wave Footer Divider -->
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">

_⚙️ Configuration_

**Environment Setup**

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

**Pairing Your Device**

1. Run the bot: `bun start`
2. Open WhatsApp on your phone
3. Go to **Linked Devices** > **Link a Device**
4. Enter the pairing code displayed in console
5. Done! Your bot is now connected

<!-- Wave Footer Divider -->
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">

_🎮 Usage_

**Command Prefixes**

Liora supports multiple prefixes:

```
.menu    # Dot prefix
!menu    # Exclamation
/menu    # Slash
```

**Built-in Commands**

| Command           | Description          | Example |
| ----------------- | -------------------- | ------- |
| `.menu` / `.help` | Display command menu | `.menu` |
| `.ping`           | Check bot latency    | `.ping` |

**Interacting with the Bot**

- **Main Menu**: Send `.menu` or `.help`
- **Category Menu**: Select category from button menu
- **Direct Command**: Use prefix + command name

<!-- Wave Footer Divider -->
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">

_🔌 Plugin System_

**Plugin Structure**

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

**Creating a Basic Plugin**

Create a file in `/src/plugins/[category]/[name].js`:

```javascript
/**
 * @file Ping command handler
 * @module plugins/info/ping
 * @license Apache-2.0
 * @author Naruya Izumi
 */

let handler = async (m, { sock }) => {
    const start = Bun.nanoseconds();
    const msg = await sock.sendMessage(m.chat, { text: "⏱️ Checking..." });
    const ns = Bun.nanoseconds() - start;
    const ms = (ns / 1_000_000).toFixed(0);

    await sock.sendMessage(m.chat, {
        text: `🏓 Pong! ${ms} ms`,
        edit: msg.key,
    });
};

handler.help = ["ping"];
handler.tags = ["info"];
handler.command = /^(ping)$/i;

export default handler;
```

**Plugin Properties**

- `handler.help` - Command names for help menu
- `handler.tags` - Category tags
- `handler.command` - RegExp pattern for command matching
- `handler.owner` - Owner-only command (optional)
- `handler.premium` - Premium-only command (optional)
- `handler.group` - Group-only command (optional)
- `handler.admin` - Admin-only command (optional)

**Learn More**

- **[PLUGINS.md](.github/PLUGINS.md)** - Complete plugin development guide
- **[BUTTONS.md](.github/BUTTONS.md)** - Interactive buttons & rich media
- **[API.md](.github/API.md)** - API integration & utilities

<!-- Wave Footer Divider -->
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">

_🚀 Production Deployment_

**Using PM2**

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

**Using Systemd**

Service file auto-created by installer at `/etc/systemd/system/liora.service`

```bash
sudo systemctl start liora
sudo systemctl enable liora
sudo systemctl status liora
```

<!-- Wave Footer Divider -->
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">

_📚 Documentation_

- **[INSTALLATION.md](.github/INSTALLATION.md)** - Detailed installation guide
- **[PLUGINS.md](.github/PLUGINS.md)** - Plugin development guide
- **[BUTTONS.md](.github/BUTTONS.md)** - Interactive buttons & carousels
- **[API.md](.github/API.md)** - API utilities & helpers
- **[Contributing Guidelines](.github/CONTRIBUTING.md)** - How to contribute
- **[Security Policy](.github/SECURITY.md)** - Report vulnerabilities
- **[Code of Conduct](.github/CODE_OF_CONDUCT.md)** - Community standards

<!-- Wave Footer Divider -->
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">

_🤝 Contributing_

<div align="center">

**Contributions are welcome!** 💖

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for details.

</div>

<!-- Wave Footer Divider -->
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">

_💬 Community_

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

_🔒 Security_

**Report vulnerabilities to:** liora.bot.official@gmail.com

> [!WARNING]
> **DO NOT** report security issues through public GitHub issues.

See [SECURITY.md](.github/SECURITY.md) for our security policy.

<!-- Wave Footer Divider -->
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">

_📄 License_

Licensed under the **Apache License 2.0**. See [LICENSE](LICENSE) for full details.

> [!CAUTION]
> Removing copyright notices or claiming original authorship violates the license and may result in legal action.

<!-- Wave Footer Divider -->
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">

_💖 Acknowledgments_

**Built with passion by developers, for developers**

**Core Technologies**

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

**Development Tools**

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

**Community & Contributors**

- 💚 All [contributors](https://github.com/naruyaizumi/liora/graphs/contributors) who made this possible
- 🌍 The amazing open-source community
- ⭐ Everyone who starred this repository
- 🐛 Bug reporters and feature requesters

<!-- Wave Footer Divider -->
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">

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
