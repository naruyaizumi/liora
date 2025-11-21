<div align="center">

![Liora Banner](https://files.catbox.moe/zyvr4m.jpg)

# 🌸 Liora

### Modern WhatsApp Bot Framework built on Baileys

<p align="center">
  <a href="https://github.com/naruyaizumi/liora/releases">
    <img src="https://img.shields.io/github/v/release/naruyaizumi/liora?style=for-the-badge&logo=semantic-release&color=FF6B6B&logoColor=white" alt="release">
  </a>
  <a href="https://github.com/naruyaizumi/liora/commits/main">
    <img src="https://img.shields.io/github/last-commit/naruyaizumi/liora?style=for-the-badge&logo=git&color=4ECDC4&logoColor=white" alt="last commit">
  </a>
  <a href="https://github.com/naruyaizumi/liora/pulls">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge&logo=github-actions&logoColor=white" alt="prs">
  </a>
  <a href="https://bun.sh">
    <img src="https://img.shields.io/badge/Bun-%3E=1.3.2-black?style=for-the-badge&logo=bun&logoColor=white" alt="bun">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-Apache%202.0-blue?style=for-the-badge&logo=apache&logoColor=white" alt="license">
  </a>
  <a href="https://whatsapp.com/channel/0029Vb5vz4oDjiOfUeW2Mt03">
    <img src="https://img.shields.io/badge/WhatsApp-Channel-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="whatsapp">
  </a>
  <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules">
    <img src="https://img.shields.io/badge/ESM-Modules-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="esm">
  </a>
  <a href="https://www.sqlite.org/index.html">
    <img src="https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="sqlite">
  </a>
  <a href="https://bun.sh/docs/runtime/hot">
    <img src="https://img.shields.io/badge/Hot-Reload-FF4154?style=for-the-badge&logo=hotjar&logoColor=white" alt="hot reload">
  </a>
</p>

---

</div>

## 🎯 Why Liora?

> **Liora** is a modern, modular, and efficient WhatsApp bot framework built on **Baileys** and powered by **Bun runtime**. Designed for developers who demand **full control**, **performance**, and **flexibility** in their automation workflows.

Built with pure ESM, hot-reloadable plugins, and native C++ addons for optimal performance.

> [!CAUTION]
> **Do not publicly disclose vulnerabilities or internal bugs.**  
> If you discover a security issue, report it responsibly through the official issue templates or via direct contact.  
> This process preserves the **integrity, stability, and trust** of the Liora ecosystem.

> [!WARNING]
> **Unauthorized modification, credit removal, or commercial distribution is strictly forbidden.**
>
> - Keep all author and contributor credits intact (README, configuration headers, and embedded metadata).
> - Redistribution, reselling, or rebranding for personal gain is a direct violation of project terms. **FVCK U BITCH!**
>
> Credits represent **respect, transparency, and acknowledgment** — not decoration.

### 🎨 What Makes Liora Different?

| Feature                     | Description                                                     |
| --------------------------- | --------------------------------------------------------------- |
| 🚀 **Baileys Integration**  | Latest WhatsApp Web API with full feature support               |
| ⚡ **Bun Runtime**          | Ultra-fast JavaScript execution, up to 3x faster than Node.js   |
| 🔥 **Hot Reload**           | Update plugins without restart, seamless development experience |
| 🧩 **Modular Architecture** | Plugin-based design pattern for easy extensibility              |
| 🎯 **Native Addons**        | C++ modules for maximum performance optimization                |
| 🔒 **SQLite Auth**          | Persistent session management with atomic operations            |
| 💎 **Zero Config**          | Works out of the box with sensible defaults                     |
| 🎨 **Clean Code**           | Modern ESM, type-safe patterns, and best practices              |

---

## 🚀 Quick Start

### 📋 Prerequisites

**System Requirements:**

```bash
# Required
- Bun >= 1.3.2
- Linux (Debian/Ubuntu recommended)
- FFmpeg
- libwebp-dev
- Build tools (gcc, g++, make)

# Recommended
- 2GB RAM minimum
- 5GB disk space
```

### ⚡ One-Line Installation

```bash
curl -sSL https://raw.githubusercontent.com/naruyaizumi/liora/main/service.sh | bash
```

### 🔧 Manual Installation

<details>
<summary><b>Step 1: Install System Dependencies</b></summary>

```bash
# Debian/Ubuntu
sudo apt-get update
sudo apt-get install -y ffmpeg libwebp-dev libavformat-dev libavcodec-dev libavutil-dev \
    libswresample-dev libswscale-dev libavfilter-dev build-essential python3 g++ \
    pkg-config cmake git curl unzip
```

</details>

<details>
<summary><b>Step 2: Install Bun Runtime</b></summary>

```bash
curl -fsSL https://bun.sh/install | bash
```

> **Note for Linux users:** The `unzip` package is required to install Bun. Use `sudo apt install unzip` to install it. Kernel version 5.6 or higher is strongly recommended, but the minimum is 5.1. Use `uname -r` to check your Kernel version.

```bash
# Verify installation
bun --version
# Output: 1.x.y

# See the precise commit of oven-sh/bun that you're using
bun --revision
# Output: 1.x.y+b7982ac13189
```

> **Troubleshooting:** If you've installed Bun but are seeing a "command not found" error, you may need to manually add the installation directory (`~/.bun/bin`) to your PATH.

```bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

source ~/.bashrc  # or ~/.zshrc
```

</details>

<details>
<summary><b>Step 3: Setup Liora</b></summary>

```bash
# Clone repository
git clone https://github.com/naruyaizumi/liora.git
cd liora

# Install dependencies
bun install

# Configure bot
nano src/config.js  # Edit owner, pairingNumber, etc.

# Start bot
bun start
```

</details>

<div align="center">

### 🎉 Bot is now running! Use pairing code to connect.

</div>

---

## 📖 Documentation

### 🔧 Configuration

<details>
<summary><b>Basic Configuration (src/config.js)</b></summary>

```javascript
global.config = {
    // Owner Configuration
    owner: [
        ["113748182302861", "Naruya Izumi"],
        ["227551947555018", "SXZnightmar"],
        // Add more: ["LOCAL_IDENTIFIER", "Name"]
    ],

    // Bot Identity
    watermark: "𝙇͢𝙞𝙤𝙧𝙖",
    author: "𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞",
    stickpack: "𝙇͢𝙞𝙤𝙧𝙖",
    stickauth: "© 𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞",

    // WhatsApp Pairing
    pairingNumber: "", // e.g., "628123456789"

    // Community
    group: "https://chat.whatsapp.com/FtMSX1EsGHTJeynu8QmjpG",
};
```

</details>

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

## 🛠️ Development Tools

### 🔍 Available Scripts

| Command               | Description            |
| --------------------- | ---------------------- |
| `bun start`           | Start the bot          |
| `bun run build:addon` | Build native addons    |
| `bun run format`      | Format code (Prettier) |
| `bun run lint`        | Check code quality     |
| `bun run lint:fix`    | Fix linting issues     |

### ⚙️ Configuration Files

| File               | Purpose            |
| ------------------ | ------------------ |
| `bunfig.toml`      | Bun runtime config |
| `eslint.config.js` | ESLint rules       |
| `binding.gyp`      | Native addon build |
| `package.json`     | Dependencies       |
| `.prettierrc`      | Code formatting    |

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

### 📢 Updates Channel

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Bell.png" width="50" />

Get latest updates, releases,
and announcements

<br><br>

[![Join Channel](https://img.shields.io/badge/Join-Channel-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://whatsapp.com/channel/0029Vb5vz4oDjiOfUeW2Mt03)

</td>
<td align="center" width="50%">

### 💭 Support Group

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Hand%20gestures/Waving%20Hand.png" width="50" />

Ask questions, share ideas,
and get help from community

<br><br>

[![Join Group](https://img.shields.io/badge/Join-Group-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://chat.whatsapp.com/FtMSX1EsGHTJeynu8QmjpG)

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
  <a href="https://nodejs.org/">
    <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  </a>
  <a href="https://www.sqlite.org/">
    <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  </a>
  <a href="https://sharp.pixelplumbing.com/">
    <img src="https://img.shields.io/badge/Sharp-99CC00?style=for-the-badge&logo=sharp&logoColor=white" alt="Sharp" />
  </a>
  <a href="https://ffmpeg.org/">
    <img src="https://img.shields.io/badge/FFmpeg-007808?style=for-the-badge&logo=ffmpeg&logoColor=white" alt="FFmpeg" />
  </a>
  <a href="https://isocpp.org/">
    <img src="https://img.shields.io/badge/C++-00599C?style=for-the-badge&logo=cplusplus&logoColor=white" alt="C++" />
  </a>
  <a href="https://www.docker.com/">
    <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  </a>
  <a href="https://www.linux.org/">
    <img src="https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black" alt="Linux" />
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
- 📖 Documentation writers and translators
- 🎨 Designers and UX contributors

---

<div align="center">

  <p><strong>🌟 Star History</strong></p>
  <a href="https://star-history.com/#naruyaizumi/liora&Date">
    <img src="https://api.star-history.com/svg?repos=naruyaizumi/liora&type=Date" width="700" alt="Star History Chart"/>
  </a>

  <hr/>

  <p><strong>Made with 🍥 and ☕ by <a href="https://github.com/naruyaizumi">Naruya Izumi</a></strong></p>
  <sub>Version 7.5.0 • Last Updated: December 2024</sub>

<br/><br/>

  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=120&section=footer&text=Thank%20You!&fontSize=40&fontColor=ffffff&animation=twinkling&fontAlignY=75" width="100%" alt="Footer"/>

</div>
