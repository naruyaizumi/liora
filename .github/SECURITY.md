# Security Policy

## 🛡️ Supported Versions

We provide security updates for active versions. Please always use the latest stable release.

| Version | Supported          | Security Updates Until |
| ------- | ------------------ | ---------------------- |
| 1.x.x   | ✅ Active          | TBD                    |
| 0.x.x   | ❌ Deprecated      | Ended                  |

## 🚨 Reporting a Vulnerability

**DO NOT report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

### Preferred Method
**Email**: [liora.bot.official@gmail.com](mailto:liora.bot.official@gmail.com?subject=Security%20Vulnerability%20Report%20-%20Liora)

### What to Include
- **Description**: Detailed explanation of the vulnerability
- **Impact**: Potential risks and affected components
- **Steps to Reproduce**: Clear reproduction steps
- **Environment**: OS, versions, configuration details
- **Proof of Concept**: Code or commands demonstrating the issue
- **Suggested Fix**: If you have any ideas for remediation

### Response Timeline
- **Initial Response**: Within 24-48 hours
- **Status Update**: Weekly updates during investigation
- **Resolution**: Depends on severity (see below)

## 🔒 Security Update Policy

| Severity | Response Time | Patch Release |
|----------|---------------|---------------|
| Critical | 24-48 hours   | Immediate patch |
| High     | 3-5 days      | Next patch release |
| Medium   | 7-14 days     | Scheduled release |
| Low      | 14-30 days    | Next minor release |

## 🛠️ Security Features

### Code Security
- **Memory Safety**: Rust components with zero-cost abstractions
- **Type Safety**: TypeScript and Rust type systems
- **Input Validation**: Comprehensive sanitization for all inputs
- **SQL Injection Prevention**: Parameterized queries and ORM
- **XSS Protection**: Output encoding and CSP-ready

### Infrastructure Security
- **Dependency Scanning**: Automated audits for npm and cargo
- **Code Analysis**: GitHub CodeQL integration
- **SAST**: Static Application Security Testing in CI/CD
- **Secrets Detection**: Pre-commit hooks and CI scanning

### Runtime Security
- **Sandboxing**: Isolated execution environments
- **Resource Limits**: Memory and CPU constraints
- **File System Restrictions**: Limited access patterns
- **Network Security**: TLS/SSL enforcement