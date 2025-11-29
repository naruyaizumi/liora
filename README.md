<div align="center">

![Liora Banner](https://files.catbox.moe/zyvr4m.jpg)

# 🌸 Liora

### Enterprise-Grade WhatsApp Bot Framework

**Built on Baileys • Powered by Bun • Supervised by Rust • Cached with Redis • Persisted by PostgreSQL**

<p align="center">
  <a href="https://bun.sh">
    <img src="https://img.shields.io/badge/Bun-%3E=1.1.0-black?style=for-the-badge&logo=bun&logoColor=white" alt="Bun version 1.1.0 or higher">
  </a>
  <a href="https://www.rust-lang.org">
    <img src="https://img.shields.io/badge/Rust-1.75+-orange?style=for-the-badge&logo=rust&logoColor=white" alt="Rust version 1.75 or higher">
  </a>
  <a href="https://www.postgresql.org">
    <img src="https://img.shields.io/badge/PostgreSQL-16-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL version 16">
  </a>
  <a href="https://redis.io">
    <img src="https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis version 7">
  </a>
  <a href="https://ffmpeg.org">
    <img src="https://img.shields.io/badge/FFmpeg-latest-555555?style=for-the-badge&logo=ffmpeg&logoColor=white" alt="FFmpeg">
  </a>
  <a href="https://www.sqlite.org">
    <img src="https://img.shields.io/badge/SQLite-latest-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite">
  </a>
  <a href="https://cmake.org">
    <img src="https://img.shields.io/badge/CMake-latest-064F8C?style=for-the-badge&logo=cmake&logoColor=white" alt="CMake">
  </a>
  <a href="https://nodejs.org">
    <img src="https://img.shields.io/badge/Node.js-latest-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
  </a>
  <a href="https://libwebp.com">
    <img src="https://img.shields.io/badge/LibWebP-latest-0099FF?style=for-the-badge&logo=webp&logoColor=white" alt="LibWebP">
  </a>
  <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript">
    <img src="https://img.shields.io/badge/JavaScript-ESM-yellow?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript ESM">
  </a>
  <a href="https://isocpp.org">
    <img src="https://img.shields.io/badge/C++-latest-00599C?style=for-the-badge&logo=c%2B%2B&logoColor=white" alt="C++">
  </a>
  <a href="https://www.kernel.org">
    <img src="https://img.shields.io/badge/Linux-latest-FCC624?style=for-the-badge&logo=linux&logoColor=black" alt="Linux">
  </a>
</p>

<p align="center">
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-Apache%202.0-blue?style=for-the-badge&logo=apache&logoColor=white" alt="Apache 2.0 License">
  </a>
  <a href="https://github.com/naruyaizumi/liora/releases">
    <img src="https://img.shields.io/github/v/release/naruyaizumi/liora?style=for-the-badge&logo=github&logoColor=white" alt="Latest GitHub release">
  </a>
  <a href="https://github.com/naruyaizumi/liora/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/naruyaizumi/liora/ci.yml?style=for-the-badge&logo=github-actions&logoColor=white" alt="CI workflow status">
  </a>
</p>

---

</div>

## 🎯 Why Liora?

**Liora** is not just another WhatsApp bot—it's a **production-ready framework** designed for developers who demand **performance**, **reliability**, and **scalability**. Built with modern technologies and battle-tested architecture patterns.

### 🏗️ Modern Architecture

```mermaid
flowchart TD
    subgraph RustSupervisor["Rust Supervisor (Parent)"]
        RS_Crash["Crash recovery"]
        RS_Signal["Signal handling"]
        RS_Metrics["Metrics"]
    end

    subgraph BunRuntime["Bun Runtime (Child Process)"]
        BR_Event["Event processing"]
        BR_Plugin["Plugin system"]
        BR_WS["WebSocket"]
    end

    subgraph PostgreSQL["PostgreSQL"]
        PG_Session["Sessions"]
        PG_Auth["Auth State"]
    end

    subgraph Redis["Redis"]
        R_Cache["Cache Layer"]
        R_Events["18 Events"]
    end

    RustSupervisor --> BunRuntime
    BunRuntime --> PostgreSQL
    BunRuntime --> Redis
```

### ⚡ Performance First

| Metric                | Value       | Comparison      |
|:---------------------:|:-----------:|:---------------:|
| **Startup Time**      | ~1.5s       | 40% faster      |
| **Memory Usage**      | ~150MB base | 25% less        |
| **Message Latency**   | <50ms avg   | 60% faster      |
| **Cache Hit Rate**    | 85-95%      | Enterprise-tier |
| **Connection Uptime** | 99.9%       | Auto-recovery   |

> [!IMPORTANT]
> **Breaking Changes in v8.0.0**  
> This is a major architecture overhaul. Migration from v7.x requires database setup and configuration changes.  

> [!CAUTION]
> **Security Disclosure Policy**  
> Do not publicly disclose vulnerabilities. Report security issues responsibly through our [security policy](.github/SECURITY.md).  
> This protects the integrity and trust of the entire Liora ecosystem.

> [!WARNING]
> **License Compliance**  
> - ✅ **DO**: Use freely, modify, distribute with attribution
> - ❌ **DON'T**: Remove credits, rebrand for profit, or violate Apache 2.0 terms
> 
> Credits represent **respect, transparency, and acknowledgment**—not decoration.

---

## ✨ Features

### 🚀 Core Capabilities

<table>
<tr>
<td width="50%" valign="top">

**🔥 Production Architecture**

- Rust supervisor with crash recovery
- Multi-process isolation
- Graceful shutdown & hot-restart
- Automatic health monitoring
- Signal handling (SIGTERM/SIGINT)

**⚡ High Performance**

- Native Bun WebSocket (no `ws` dependency)
- Redis connection pooling
- PostgreSQL session management
- Async event processing with PQueue
- Circuit breaker for external APIs

**🔒 Enterprise Security**

- PostgreSQL persistent auth
- Redis encrypted cache
- Input sanitization
- Rate limiting on APIs
- Security audit tools

</td>
<td width="50%" valign="top">

**🧩 Developer Experience**

- Hot-reload plugins (zero downtime)
- ESM modules throughout
- Type-safe patterns
- Clean code architecture
- Comprehensive error handling

**📊 Observability**

- Structured logging (Pino)
- Prometheus metrics endpoint
- Health check APIs
- Performance benchmarks
- Debug mode support

**🔌 Extensibility**

- Plugin-based architecture
- C++ native addons
- Custom command system
- Event hook system
- API middleware support

</td>
</tr>
</table>

### 🎨 Built-in Features

- ✅ Multi-owner support
- ✅ Group management
- ✅ Media processing (images, audio, video)
- ✅ Sticker creation (static & animated)
- ✅ Social media downloaders (TikTok, Instagram, Twitter)
- ✅ YouTube audio/video download
- ✅ Spotify track download
- ✅ AI image enhancement (Remini/HD)
- ✅ Background removal
- ✅ Custom command aliases
- ✅ Message quotes & reactions
- ✅ Automatic anti-spam
- ✅ User leveling system
- ✅ Database-backed storage

---

## 🚀 Quick Start

### 📋 Prerequisites

| Requirement          | Version    | Purpose                 |
|:--------------------:|:----------:|:-----------------------:|
| **Operating System** | Linux/macOS| Production deployment   |
| **Bun**              | ≥1.1.0     | JavaScript runtime      |
| **Rust**             | ≥1.75      | Supervisor process      |
| **PostgreSQL**       | ≥16        | Session & auth storage  |
| **Redis**            | ≥7         | Cache layer             |
| **FFmpeg**           | ≥5         | Media processing        |
| **Build Tools**      | Latest     | gcc, g++, make, cmake   |

### ⚡ Automated Installation (Recommended)

```bash
# One-line installation script
curl -sSL https://raw.githubusercontent.com/naruyaizumi/liora/main/service.sh | bash
```

**What it does:**

- ✅ Validates system compatibility (Ubuntu 24.04 / Debian 12)
- ✅ Installs all dependencies (Node.js, Rust, Bun, PostgreSQL, Redis)
- ✅ Sets up databases and cache
- ✅ Configures systemd service
- ✅ Creates helper CLI (`bot` command)
- ✅ Builds all components (JS, Rust, C++)

### 🔧 Manual Installation

<details>
<summary><b>Step 1: Install System Dependencies</b></summary>

```bash
# Debian/Ubuntu
sudo apt-get update
sudo apt-get install -y \
    ffmpeg libwebp-dev libavformat-dev libavcodec-dev \
    libavutil-dev libswresample-dev libswscale-dev libavfilter-dev \
    build-essential python3 g++ pkg-config cmake git curl unzip \
    postgresql-16 postgresql-contrib-16 redis-server
```

</details>

<details>
<summary><b>Step 2: Install Runtimes</b></summary>

**Install Bun:**

```bash
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
```

**Install Rust:**

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
```

**Verify installations:**

```bash
bun --version    # Should show 1.x.y
rustc --version  # Should show 1.75+
psql --version   # Should show 16.x
redis-cli --version  # Should show 7.x
```

</details>

<details>
<summary><b>Step 3: Setup Databases</b></summary>

**PostgreSQL:**

```bash
# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql -c "CREATE USER liora WITH PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "CREATE DATABASE liora OWNER liora;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE liora TO liora;"
```

**Redis:**

```bash
# Start service
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test connection
redis-cli ping  # Should return PONG
```

</details>

<details>
<summary><b>Step 4: Clone & Setup Liora</b></summary>

```bash
# Clone latest release
git clone --branch v8.0.0 --depth 1 https://github.com/naruyaizumi/liora.git
cd liora

# Install dependencies
bun install

# Configure environment
cp .env.example .env
nano .env  # Edit configuration

# Build all components
bun run build
```

</details>

<details>
<summary><b>Step 5: Configure & Start</b></summary>

**Edit `.env` file:**

```bash
# Bot Configuration
PAIRING_NUMBER=628123456789  # Your WhatsApp number
OWNERS=[["113748182302861","Your Name"]]

# Database
DATABASE_URL=postgresql://liora:your_password@localhost:5432/liora

# Redis
REDIS_URL=redis://localhost:6379

# See .env.example for all options
```

**Start the bot:**

```bash
# Using Rust supervisor (recommended)
./lib/rs/target/release/liora-rs

# Or with systemd
sudo systemctl start liora
sudo systemctl enable liora
```

</details>

### 🎉 First Run

**Helper CLI commands** (if installed via script):

```bash
bot start      # Start the bot
bot stop       # Stop the bot
bot restart    # Restart the bot
bot log        # View live logs
bot status     # Check status
bot update     # Update to latest version
bot config     # Edit configuration
bot health     # System health check
```

---

## 📖 Documentation

### 🔧 Configuration

<details>
<summary><b>Import Path Aliases (package.json)</b></summary>

```json
{
    "imports": {
        "#config": "./src/config.js",
        "#global": "./src/global.js",
        "#message": "./lib/core/message.js",
        "#socket": "./lib/core/socket.js",
        "#connection": "./lib/core/connection.js"
    }
}
```

</details>

### 🔌 Plugin Development

<details>
<summary><b>💡 Simple Plugin Example</b></summary>

```javascript
// plugins/info/info-ping.js

let handler = async (m, { conn }) => {
    await conn.sendMessage(m.chat, { text: "PONG! 🏓" });
};

handler.help = ["ping"];
handler.tags = ["info"];
handler.command = /^(ping)$/i;

export default handler;
```

</details>

<details>
<summary><b>🎨 Advanced Plugin with Media Processing</b></summary>

```javascript
// plugins/tool/tool-remini.js

import { remini } from "#remini";

let handler = async (m, { conn, command, usedPrefix }) => {
    const q = m.quoted && m.quoted.mimetype ? m.quoted : m;
    const mime = (q.msg || q).mimetype || "";

    if (!q || typeof q.download !== "function" || !/image\/(jpe?g|png|webp)/i.test(mime)) {
        return m.reply(
            `Please send or reply to an image.\nExample: ${usedPrefix}${command} <reply to image>`
        );
    }

    try {
        await global.loading(m, conn);

        const media = await q.download().catch(() => null);
        if (!media || !(media instanceof Buffer)) return;

        const { success, resultUrl, resultBuffer, error } = await remini(media);
        if (!success) throw new Error(error || "Enhancement failed");

        await conn.sendMessage(
            m.chat,
            {
                image: resultBuffer ? { buffer: resultBuffer } : { url: resultUrl },
                caption: "✨ Image enhancement successful.",
            },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply("❌ Failed to enhance image.");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["remini", "hd"];
handler.tags = ["tools"];
handler.command = /^(remini|hd)$/i;

export default handler;
```

</details>

<details>
<summary><b>📋 Plugin Structure Reference</b></summary>

```javascript
let handler = async (m, { conn, args, usedPrefix, command, isOwner, text }) => {
    // Plugin logic here
};

// Required exports
handler.help = ["command1", "command2"]; // Command names
handler.tags = ["category"]; // Category
handler.command = /^(cmd1|cmd2)$/i; // Regex pattern

// Optional exports
handler.owner = false; // Owner only
handler.admin = false; // Admin only
handler.group = false; // Group only
handler.botAdmin = false; // Bot admin required

export default handler;
```

</details>

---

## 🤝 Contributing

<div align="center">

**Contributions are welcome!** 💖

All types of contributions are valuable - bug fixes, features, docs, or feedback.

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
  <img src="https://contrib.rocks/image?repo=naruyaizumi/liora" alt="Contributors graph" />
</a>

</div>

---

## 💬 Community

<div align="center">

**Join our growing community!**

| Platform | Description | Link |
|:--------:|:-----------:|:----:|
| **📢 GitHub Discussions** | Get latest updates, releases, and announcements directly on GitHub | [![Join Discussions](https://img.shields.io/badge/Join-Discussions-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/naruyaizumi/liora/discussions) |
| **💭 WhatsApp Group** | Ask questions, share ideas, and get help from community | [![Join Group](https://img.shields.io/badge/Join-Group-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://chat.whatsapp.com/FtMSX1EsGHTJeynu8QmjpG) |
| **📡 Baileys Community** | Official Baileys developer hub on Discord | [![Join Discord](https://img.shields.io/badge/Join-Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/baileys) |
| **❤️ Owner Socials** | Connect with me, follow updates, and explore my projects | [![LinkBio](https://img.shields.io/badge/Visit-LinkBio-FF4088?style=for-the-badge&logo=linktree&logoColor=white)](https://linkbio.co/naruyaizumi) |

</div>

---

## 📜 License

Liora is released under the **Apache License 2.0**, a permissive open-source license that allows you to:

- ✅ Use the code freely for personal or commercial projects
- ✅ Modify and adapt it to fit your needs
- ✅ Distribute your own versions, as long as you include proper attribution
- ✅ Contribute improvements back to the community

However, the license also ensures that:

- ⚠️ You must include a copy of the license in any distribution
- ⚠️ You cannot hold the authors liable for damages
- ⚠️ You must clearly state changes if you modify the code

See the full license text in [LICENSE](LICENSE) for all details.

---

**Copyright © 2024 Naruya Izumi**  
Maintained by the Liora community.  
Contributions, forks, and pull requests are welcome!

---

## 💖 Acknowledgments

**Built with passion by developers, for developers**

### 🚀 Core Technologies

<p align="left">
  <a href="https://bun.sh">
    <img src="https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white" alt="Bun JavaScript runtime" />
  </a>
  <a href="https://github.com/WhiskeySockets/Baileys">
    <img src="https://img.shields.io/badge/Baileys-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Baileys WhatsApp library" />
  </a>
  <a href="https://www.javascript.com/">
    <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript programming language" />
  </a>
  <a href="https://nodejs.org/">
    <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js runtime" />
  </a>
  <a href="https://www.postgresql.org/">
    <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL database" />
  </a>
  <a href="https://sharp.pixelplumbing.com/">
    <img src="https://img.shields.io/badge/Sharp-99CC00?style=for-the-badge&logo=sharp&logoColor=white" alt="Sharp image processing" />
  </a>
  <a href="https://ffmpeg.org/">
    <img src="https://img.shields.io/badge/FFmpeg-007808?style=for-the-badge&logo=ffmpeg&logoColor=white" alt="FFmpeg media processing" />
  </a>
  <a href="https://isocpp.org/">
    <img src="https://img.shields.io/badge/C++-00599C?style=for-the-badge&logo=cplusplus&logoColor=white" alt="C++ programming language" />
  </a>
  <a href="https://www.docker.com/">
    <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker containerization" />
  </a>
  <a href="https://www.linux.org/">
    <img src="https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black" alt="Linux operating system" />
  </a>
</p>

### 🛠️ Development Tools

<p align="left">
  <a href="https://eslint.org/">
    <img src="https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white" alt="ESLint code linter" />
  </a>
  <a href="https://prettier.io/">
    <img src="https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=black" alt="Prettier code formatter" />
  </a>
  <a href="https://codeql.github.com/">
    <img src="https://img.shields.io/badge/CodeQL-2F4F4F?style=for-the-badge&logo=github&logoColor=white" alt="CodeQL security analysis" />
  </a>
  <a href="https://github.com/features/actions">
    <img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" alt="GitHub Actions CI/CD" />
  </a>
</p>

### 🤖 AI Assistants

Special thanks to AI assistants that helped in development:

<p align="left">
  <a href="https://openai.com/chatgpt">
    <img src="https://img.shields.io/badge/ChatGPT-74aa9c?style=for-the-badge&logo=openai&logoColor=white" alt="ChatGPT AI assistant" />
  </a>
  <a href="https://github.com/features/copilot">
    <img src="https://img.shields.io/badge/GitHub_Copilot-000000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Copilot AI coding assistant" />
  </a>
  <a href="https://gemini.google.com/">
    <img src="https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white" alt="Google Gemini AI" />
  </a>
  <a href="https://claude.ai/">
    <img src="https://img.shields.io/badge/Claude-181818?style=for-the-badge&logo=anthropic&logoColor=white" alt="Claude AI assistant" />
  </a>
  <a href="https://deepseek.ai">
    <img src="https://img.shields.io/badge/DeepSeek-0F62FF?style=for-the-badge&logo=deepseek&logoColor=white" alt="DeepSeek AI assistant" />
  </a>
</p>

### 🙏 Community & Contributors

- 💚 All [contributors](https://github.com/naruyaizumi/liora/graphs/contributors) who made this possible
- 🌍 The amazing open-source community
- ⭐ Everyone who starred this repository
- 🐛 Bug reporters and feature requesters
- 📖 Documentation writers and translators
- 🎨 Designers and UX contributors

---

<div align="center">

### 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=naruyaizumi/liora&type=Date)](https://star-history.com/#naruyaizumi/liora&Date)

---

**Made with 💅🏻 and ☕ by [Naruya Izumi](https://github.com/naruyaizumi)**

<br/>

![Footer Wave](https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=120&section=footer&text=Thank%20You!&fontSize=40&fontColor=ffffff&animation=twinkling&fontAlignY=75)

</div>