# Contributing to Liora

First off, thank you for considering contributing to Liora! It's people like you that make Liora such a great tool. 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to sexystyle088@gmail.com.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
    ```bash
    git clone https://github.com/YOUR-USERNAME/liora.git
    cd liora
    ```
3. **Add upstream remote**:
    ```bash
    git remote add upstream https://github.com/naruyaizumi/liora.git
    ```
4. **Create a branch** for your changes:
    ```bash
    git checkout -b feature/your-feature-name
    ```

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find that the problem has already been reported. When creating a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (code snippets, screenshots)
- **Describe the behavior you observed** and what you expected
- **Include your environment details** (OS, Bun version, Node version)

Use our [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.yml).

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the proposed enhancement
- **Explain why this enhancement would be useful**
- **List some examples** of how it would be used

Use our [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.yml).

### Your First Code Contribution

Unsure where to begin? You can start by looking through `good-first-issue` and `help-wanted` labels:

- **good-first-issue** - Issues that should only require a few lines of code
- **help-wanted** - Issues that are a bit more involved

### Pull Requests

1. Follow the [Coding Standards](#coding-standards)
2. Update documentation if needed
3. Add tests for new functionality
4. Ensure all tests pass
5. Follow the [Commit Guidelines](#commit-guidelines)
6. Fill in the Pull Request template

## Development Setup

### Prerequisites

- **Bun** >= 1.1.0 (recommended) or **Node.js** >= 24.0.0
- **Git**
- **System dependencies**:

    ```bash
    # Ubuntu/Debian
    sudo apt-get install -y ffmpeg libwebp-dev build-essential python3 g++ cmake

    # RHEL/CentOS/Fedora
    sudo dnf install -y ffmpeg gcc-c++ python3 cmake

    # Arch Linux
    sudo pacman -S ffmpeg base-devel python cmake
    ```

### Setup Steps

1. **Install Bun** (if not already installed):

    ```bash
    curl -fsSL https://bun.sh/install | bash
    ```

2. **Install dependencies**:

    ```bash
    bun install
    ```

3. **Build native modules**:

    ```bash
    bun run build
    ```

4. **Run the bot**:
    ```bash
    bun run src/index.js
    ```

## Coding Standards

### JavaScript/TypeScript

- Follow the existing code style (enforced by ESLint and Prettier)
- Use meaningful variable and function names
- Write comments for complex logic
- Keep functions small and focused

**Format code before committing**:

```bash
bun run format
bun run lint:fix
```

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Code style changes (formatting, missing semi-colons, etc)
- **refactor**: Code changes that neither fix a bug nor add a feature
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **build**: Changes to build system or dependencies
- **ci**: Changes to CI configuration
- **chore**: Other changes that don't modify src or test files

### Examples

```bash
feat(api): add TikTok download support

Add new API endpoint for downloading TikTok videos
Includes support for watermark removal

Closes #123
```

```bash
fix(auth): resolve session timeout issue

Fix bug where sessions would timeout prematurely
Update keep-alive logic

Fixes #456
```

### Scope

The scope should be the name of the affected module:

- **api** - API integrations
- **auth** - Authentication
- **core** - Core functionality
- **cli** - Command line interface
- **deps** - Dependencies
- **ci** - CI/CD

## Pull Request Process

1. **Update your fork**:

    ```bash
    git fetch upstream
    git rebase upstream/main
    ```

2. **Push your changes**:

    ```bash
    git push origin feature/your-feature-name
    ```

3. **Create Pull Request** on GitHub

4. **Fill in the PR template** completely

5. **Wait for review** - A maintainer will review your PR

6. **Make requested changes** if needed

7. **Celebrate!** 🎉 Your PR will be merged

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review of code completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] PR description is clear and complete

## Testing

### Running Tests

```bash
# JavaScript tests
bun test

# Integration tests
bun run test:integration
```

### Writing Tests

- Write tests for all new features
- Ensure tests are deterministic
- Use descriptive test names
- Keep tests focused and simple

## Documentation

### Code Documentation

- Use JSDoc for JavaScript functions
- Document public APIs
- Include examples in documentation
- Keep documentation up to date

**Generate documentation**:

```bash
bun run docs:generate
```

### README Updates

If your changes affect:

- Installation process
- Usage instructions
- Configuration options
- Available commands

Please update the README.md accordingly.

## Project Structure

```
liora/
├── src/              # Main application code
│   ├── config.js     # Configuration
│   ├── global.js     # Global utilities
│   └── index.js      # Entry point
├── lib/              # Libraries and modules
│   ├── api/          # API integrations
│   ├── core/         # Core functionality
│   └── auth/         # Authentication
├── docs/             # Documentation
├── .github/          # GitHub configuration
│   └── workflows/    # CI/CD workflows
└── tests/            # Test files
```

## Community

### Get Help

- **GitHub Discussions**: Ask questions and share ideas
- **GitHub Issues**: Report bugs and request features
- **Email**: sexystyle088@gmail.com

### Stay Updated

- Watch the repository for updates
- Star the project if you find it useful
- Follow [@naruyaizumi](https://github.com/naruyaizumi)

## Recognition

Contributors are recognized in several ways:

- Listed in [CONTRIBUTORS.md](CONTRIBUTORS.md)
- Mentioned in release notes
- Featured in monthly recap discussions
- Added to repository contributors list

## License

By contributing to Liora, you agree that your contributions will be licensed under the Apache-2.0 License.

## Questions?

Don't hesitate to ask! Open an issue with the `question` label or reach out via email.

---

**Thank you for contributing to Liora! 🚀**

Made with ❤️ by the Liora community
