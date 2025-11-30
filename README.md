<div align="center">

![Liora Banner](https://files.catbox.moe/zyvr4m.jpg)

# 🌸 Liora

### Enterprise-Grade WhatsApp Bot

**Built on Baileys • Powered by Bun • Supervised by Rust • Cached with Redis • Persisted by PostgreSQL**

<p align="center">
  <a href="https://bun.sh">
    <img src="https://img.shields.io/badge/Runtime-Bun-black?style=for-the-badge&logo=bun&logoColor=white" alt="Bun Runtime">
  </a>
  <a href="https://www.rust-lang.org">
    <img src="https://img.shields.io/badge/Native-Rust-orange?style=for-the-badge&logo=rust&logoColor=white" alt="Rust Native">
  </a>
  <a href="https://www.postgresql.org">
    <img src="https://img.shields.io/badge/Database-PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  </a>
  <a href="https://redis.io">
    <img src="https://img.shields.io/badge/Cache-Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis">
  </a>
  <a href="https://ffmpeg.org">
    <img src="https://img.shields.io/badge/Media-FFmpeg-555555?style=for-the-badge&logo=ffmpeg&logoColor=white" alt="FFmpeg">
  </a>
  <a href="https://www.sqlite.org">
    <img src="https://img.shields.io/badge/Embedded-SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite">
  </a>
  <a href="https://cmake.org">
    <img src="https://img.shields.io/badge/Build-CMake-064F8C?style=for-the-badge&logo=cmake&logoColor=white" alt="CMake">
  </a>
  <a href="https://nodejs.org">
    <img src="https://img.shields.io/badge/Compat-Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js Compatible">
  </a>
  <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript">
    <img src="https://img.shields.io/badge/ES-Modules-yellow?style=for-the-badge&logo=javascript&logoColor=black" alt="ES Modules">
  </a>
  <a href="https://isocpp.org">
    <img src="https://img.shields.io/badge/Native-C++-00599C?style=for-the-badge&logo=c%2B%2B&logoColor=white" alt="C++ Native">
  </a>
  <a href="https://www.kernel.org">
    <img src="https://img.shields.io/badge/Platform-Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black" alt="Linux Platform">
  </a>
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

**Liora** is not just another WhatsApp bot—it's a **production-ready** designed for developers who demand **performance**, **reliability**, and **scalability**. Built with modern technologies and battle-tested architecture patterns.

### 🏗️ Modern Architecture

```mermaid
graph TB
    %% Rust Supervisor Layer
    RS[main.rs<br/>Rust Supervisor]
    RS --> RS_HTTP[http.rs<br/>HTTP Server]
    RS --> RS_AUTH[auth.rs<br/>Auth Service]
    RS --> RS_CONF[config.rs<br/>Config Manager]

    %% Bun Main Process Layer
    BN[main.js<br/>Bun Main Process]
    RS --> BN

    %% Connection & Socket Layer
    BN --> CONN[connection.js<br/>Connection Manager]
    CONN --> SOCK[socket.js<br/>WebSocket Client]
    SOCK --> BAIL[Baileys<br/>WhatsApp WebSocket]

    %% Event Processing Layer
    BAIL --> EVTS[18 Events<br/>Message/Chat/Group]
    EVTS --> REDIS[Redis<br/>Event Cache & Pub/Sub]
    EVTS --> HAND[handler.js<br/>Event Handler]

    %% Plugin & Command Layer
    HAND --> PLUG[Plugins System<br/>Command Router]
    PLUG --> CMDS[Commands<br/>Message Processing]

    %% External Services Layer
    CMDS --> EXTS[External APIs<br/>Instagram/Spotify/TikTok]
    EXTS --> EXT_IG[instagram.js]
    EXTS --> EXT_SP[spotify.js]
    EXTS --> EXT_TK[tiktok.js]
    EXTS --> EXT_YT[ytmp3/ytmp4.js]

    %% Media Processing Layer
    CMDS --> MEDIA[Media Processing]
    MEDIA --> BRIDGE[bridge.js<br/>Native Bridge]
    BRIDGE --> CPP_ST[sticker.cpp<br/>Sticker Converter]
    BRIDGE --> CPP_CV[converter.cpp<br/>Audio Converter]

    %% Worker Pool Layer
    CPP_ST --> WORKERS[Worker Pool<br/>Bun Workers]
    CPP_CV --> WORKERS
    WORKERS --> WRK_ST[sticker-worker.js]
    WORKERS --> WRK_CV[converter-worker.js]

    %% Database Layer
    RS_AUTH --> PG[PostgreSQL<br/>Session Auth]
    BN --> PG
    HAND --> PG

    %% Styling
    classDef rust fill:#ff6b6b,color:#fff
    classDef bun fill:#cbf0ff,color:#000
    classDef cpp fill:#659ad2,color:#fff
    classDef database fill:#52c41a,color:#fff
    classDef external fill:#faad14,color:#000
    classDef worker fill:#722ed1,color:#fff
    classDef network fill:#13c2c2,color:#000

    class RS,RS_HTTP,RS_AUTH,RS_CONF rust
    class BN,CONN,SOCK,HAND,PLUG,CMDS bun
    class CPP_ST,CPP_CV,BRIDGE cpp
    class PG,REDIS database
    class EXTS,EXT_IG,EXT_SP,EXT_TK,EXT_YT external
    class WORKERS,WRK_ST,WRK_CV worker
    class BAIL,EVTS network
```

> [!IMPORTANT]
> **Breaking Changes in v8.0.0**  
> This is a major architecture overhaul. Migration from v7.x requires database setup and configuration changes.

> [!CAUTION]
> **Security Disclosure Policy**  
> Do not publicly disclose vulnerabilities. Report security issues responsibly through our [security policy](.github/SECURITY.md).  
> This protects the integrity and trust of the entire Liora ecosystem.

> [!WARNING]
> **License Compliance**
>
> - **DO**: Use freely, modify, distribute with attribution
> - **DON'T**: Remove credits, rebrand for profit, or violate Apache 2.0 terms
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

---

## 🚀 Quick Start

### ⚡ One-Line Installation

```bash
curl -sSL https://raw.githubusercontent.com/naruyaizumi/liora/main/service.sh | bash
```

</div>

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

**📢 GitHub Discussions**

<img src="https://github.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/blob/master/Emojis/Objects/Open%20Book.png" width="50" />

Get latest updates, releases,
and announcements directly on GitHub

<br><br>

[![Join Discussions](https://img.shields.io/badge/Join-Discussions-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/naruyaizumi/liora/discussions)

</td>
<td align="center" width="50%">

**💭 WhatsApp Group**

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Bell.png" width="50" />

Ask questions, share ideas,
and get help from community

<br><br>

[![Join Group](https://img.shields.io/badge/Join-Group-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://chat.whatsapp.com/FtMSX1EsGHTJeynu8QmjpG)

</td>
</tr>
<tr>
<td align="center" width="50%">

**📡 Baileys Community**

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Satellite%20Antenna.png" width="50" />

Official Baileys developer hub
on Discord

<br><br>

[![Join Discord](https://img.shields.io/badge/Join-Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/baileys)

</td>
<td align="center" width="50%">

**❤️ Owner Socials**

<img src="https://github.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/blob/master/Emojis/Objects/DNA.png" width="50" />

Connect with me, follow updates,
and explore my projects

<br><br>

[![LinkBio](https://img.shields.io/badge/Visit-LinkBio-FF4088?style=for-the-badge&logo=linktree&logoColor=white)](https://linkbio.co/naruyaizumi)

</td>
</tr>
</table>

</div>

---

## 📜 License

Liora is released under the **Apache License 2.0**, a permissive open-source license that allows you to:

- Use the code freely for personal or commercial projects
- Modify and adapt it to fit your needs
- Distribute your own versions, as long as you include proper attribution
- Contribute improvements back to the community

However, the license also ensures that:

- You must include a copy of the license in any distribution
- You cannot hold the authors liable for damages
- You must clearly state changes if you modify the code

See the full license text in [LICENSE](LICENSE) for all details.

---

**Copyright © 2024 Naruya Izumi**  
Maintained by the Liora community.
Contributions, forks, and pull requests are welcome!

---

<div align="center">

  <p><strong>🌟 Star History</strong></p>
  <a href="https://star-history.com/#naruyaizumi/liora&Date">
    <img src="https://api.star-history.com/svg?repos=naruyaizumi/liora&type=Date" width="700" alt="Star History Chart"/>
  </a>

</div>
