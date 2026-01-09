# Liora Bot

**Enterprise-Grade WhatsApp Bot Framework**

Built on Baileys • Powered by Bun Runtime

---

## Overview

Liora is a production-ready WhatsApp bot framework designed for developers who demand performance, reliability, and scalability. Built with modern technologies and battle-tested architecture patterns.

### Key Features

- **Blazing Fast Performance**: Native Bun runtime delivers unmatched speed and efficiency
- **Modern Architecture**: ESM-first design with clean, maintainable codebase
- **Lightweight Database**: Native `bun:sqlite` - no external database services required
- **Zero Dependencies Overhead**: Minimal, optimized dependencies for production use
- **Server Ready**: Deploy anywhere - Server, Pterodactyl, or containerized environments
- **Rich Media Support**: Buttons, carousels, albums, and group stories out of the box

---

## System Requirements

### Minimum Requirements

| Component    | Requirement                       |
| ------------ | --------------------------------- |
| OS           | Linux (Ubuntu 22.04+, Debian 12+) |
| Architecture | x86_64                            |
| CPU          | 2 cores                           |
| RAM          | 4GB                               |
| Storage      | 10GB SSD                          |
| Network      | Stable internet connection        |
| Bun          | v1.3.0+                           |

### Recommended for Production

| Component | Recommendation             |
| --------- | -------------------------- |
| CPU       | 4+ cores                   |
| RAM       | 8GB+                       |
| Storage   | 20GB+ NVMe SSD             |
| Network   | Dedicated IP with 100Mbps+ |

---

## Quick Start

### Automated Installation (Recommended)

One-line installation with systemd service configuration:

```bash
curl -fsSL https://raw.githubusercontent.com/naruyaizumi/liora/main/install.sh | bash
```

Post-installation commands:

```bash
# Configure bot
bot config

# Start service
bot start

# View logs
bot log

# Check status
bot status
```

### Manual Installation

#### 1. Install Bun Runtime

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Load Bun environment
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Verify installation
bun --version
```

#### 2. Clone Repository

```bash
git clone https://github.com/naruyaizumi/liora.git
cd liora
```

#### 3. Configure Environment

```bash
# Copy example configuration
cp .env.example .env

# Edit configuration
nano .env
```

#### 4. Install Dependencies

```bash
bun install
```

#### 5. Run the Bot

**Development Mode:**

```bash
bun run dev
```

**Production Mode:**

```bash
bun start
```

---

## Production Deployment

### Using PM2 (Recommended)

#### Install PM2

```bash
npm install -g pm2
```

#### Create Ecosystem File

```bash
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
```

#### PM2 Commands

```bash
# Start application
pm2 start ecosystem.config.js

# Save configuration
pm2 save

# Enable startup script
pm2 startup

# View logs
pm2 logs liora

# Monitor resources
pm2 monit

# Restart application
pm2 restart liora

# Stop application
pm2 stop liora

# Remove from PM2
pm2 delete liora
```

### Using Systemd (Automated)

The automated installer creates a systemd service. Manual service file example:

```ini
[Unit]
Description=Liora WhatsApp Bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=liora
WorkingDirectory=/opt/liora
ExecStart=/usr/local/bin/bun run --smol src/main.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

---

## License and Usage Rights

This project is licensed under the **Apache License 2.0**.

You are free to:

- Use this software for any purpose, including commercial use
- Modify the source code
- Distribute original or modified versions
- Sublicense your modifications
- Sell services or products based on this software

### Attribution and License Requirements

> [!IMPORTANT]
> When redistributing this software or derivative works, you must:
>
> - Retain original copyright notices
> - Include a copy of the Apache License 2.0
> - Preserve attribution to the original author: **Naruya Izumi**

Maintaining a reference to the original repository is strongly recommended to ensure transparency and proper attribution.

### License Violations

> [!CAUTION]
> The following actions constitute violations of the Apache License 2.0:
>
> - Removing or altering copyright or license notices
> - Claiming original authorship of this project
> - Distributing derivative works without proper attribution
> - Initiating patent litigation against the Work or its Contributors

Violation of the license may result in termination of usage rights and potential legal consequences under applicable intellectual property laws.

### Commercial Use

Commercial use is permitted, including:

- Offering the software as a service (SaaS)
- Integrating it into commercial products
- Providing paid support, consulting, or customization

**Commercial distributors must:**

- Retain all required notices
- Include the Apache License 2.0
- Clearly indicate any modifications made

---

## Security

### Reporting Vulnerabilities

> [!WARNING]
> **DO NOT** report security vulnerabilities through public GitHub issues.

**Responsible Disclosure:**

- Email: liora.bot.official@gmail.com
- Subject: "Security Vulnerability Report - Liora"
- Include: Detailed description, reproduction steps, impact assessment

**Response Timeline:**

- Initial response: 24-48 hours
- Status updates: Weekly during investigation
- Resolution: Based on severity (see [SECURITY.md](.github/SECURITY.md))

### Security Features

- **Input Validation**: Comprehensive sanitization for all user inputs
- **Resource Limits**: Memory and CPU constraints to prevent abuse
- **Sandboxed Execution**: Isolated plugin environment
- **Dependency Scanning**: Automated security audits
- **Type Safety**: Strict typing throughout codebase

---

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](.github/CONTRIBUTING.md) for details.

### Quick Contribution Guide

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Development Standards

- Follow existing code style
- Write meaningful commit messages (Conventional Commits)
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for detailed guidelines.

---

## Support and Community

### Get Help

- **GitHub Issues**: Report bugs and request features
- **Email**: liora.bot.official@gmail.com

### Stay Updated

- Watch this repository for updates
- Star the project if you find it useful
- Follow [@naruyaizumi](https://github.com/naruyaizumi) on GitHub

---

## Project Statistics

### Repository Analytics

![Repobeats Analytics](https://repobeats.axiom.co/api/embed/80e8d22ce1b99e5cdc62a986f74bbac8f9e2ed5b.svg)

### Star History

[![Star History Chart](https://api.star-history.com/svg?repos=naruyaizumi/liora&type=Date)](https://star-history.com/#naruyaizumi/liora&Date)

---

## Acknowledgments

### Contributors

Thank you to all contributors who have helped improve Liora. See [CONTRIBUTORS.md](CONTRIBUTORS.md) for the full list.

### Open Source

This project builds upon excellent open source projects:

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API
- [Bun](https://bun.sh) - Fast JavaScript runtime

---

## Legal

### Copyright

Copyright © 2024 Naruya Izumi

### License

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

### Trademark Notice

"Liora" and associated logos are trademarks of Naruya Izumi. Use of these trademarks requires prior written permission.

---

**Made with dedication by [Naruya Izumi](https://github.com/naruyaizumi)**

**Repository**: https://github.com/naruyaizumi/liora  
**License**: Apache 2.0  
**Maintained by**: Liora Community
