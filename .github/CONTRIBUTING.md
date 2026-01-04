# Contributing to Liora

First off, thank you for considering contributing to Liora! It's people like you that make Liora such a great tool. 🎉

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to liora.bot.official@gmail.com.

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

- **Bun** >= 1.0.0 (required)
- **Node.js** >= 24.0.0
- **Git**
- **PostgreSQL** >= 14
- **Redis** >= 6
- **System dependencies**:

    ```bash
    # Ubuntu/Debian
    sudo apt-get install -y \
        ffmpeg build-essential python3 git curl wget \
        ca-certificates postgresql redis-server
    ```

### Setup Instructions

1. **Install Bun** (required):
    ```bash
    curl -fsSL https://bun.sh/install | bash
    ```

2. **Install Node.js via NVM**:
    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    nvm install 24
    nvm use 24
    ```

3. **Clone and setup**:
    ```bash
    git clone https://github.com/YOUR-USERNAME/liora.git
    cd liora
    bun install
    ```

4. **Setup PostgreSQL**:
    ```bash
    sudo -u postgres psql <<EOF
    CREATE USER liora WITH PASSWORD 'liora';
    CREATE DATABASE liora OWNER liora;
    GRANT ALL PRIVILEGES ON DATABASE liora TO liora;
    EOF
    ```

5. **Setup Redis**:
    ```bash
    sudo systemctl start redis-server
    sudo systemctl enable redis-server
    ```

6. **Configure environment**:
    ```bash
    cp .env.example .env
    nano .env
    ```

7. **Run the bot**:
    ```bash
    bun src/index.js
    ```

## Coding Standards

### JavaScript

- Follow the existing code style (enforced by ESLint and Prettier)
- Use meaningful variable and function names
- Write comments for complex logic
- Keep functions small and focused
- Use modern JavaScript features (ES6+)

### Code Formatting

Before committing, ensure your code is properly formatted:

```bash
# Install Prettier
bun add -D prettier

# Format code
bunx prettier --write .
```

### Linting

Run ESLint to check for code quality issues:

```bash
# Install ESLint
bun add -D eslint @eslint/js globals

# Run linter
bunx eslint .
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

### Scope

The scope should be the name of the affected module:

- **api** - API integrations
- **auth** - Authentication
- **core** - Core functionality
- **cli** - Command line interface
- **deps** - Dependencies
- **ci** - CI/CD
- **database** - PostgreSQL related
- **redis** - Redis cache related

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
Update keep-alive logic in PostgreSQL store

Fixes #456
```

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

### Writing Tests

- Write tests for all new features
- Ensure tests are deterministic
- Use descriptive test names
- Keep tests focused and simple

## Architecture Overview

Liora uses a modern, pure JavaScript architecture:

- **Pure JavaScript**: 100% JavaScript, no native bindings
- **PostgreSQL**: Session and authentication storage
- **Redis**: Real-time chat data caching
- **SQLite**: Local user database
- **Bun**: Primary runtime for performance

## Community

### Get Help

- **GitHub Discussions**: Ask questions and share ideas
- **GitHub Issues**: Report bugs and request features
- **Email**: liora.bot.official@gmail.com

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