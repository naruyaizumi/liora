# Contributing to Liora

Thank you for considering contributing to Liora. This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

---

## Code of Conduct

This project adheres to the [GitHub Community Code of Conduct](https://docs.github.com/en/site-policy/github-terms/github-community-code-of-conduct). By participating, you are expected to uphold this code.

### Expected Behavior

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Acknowledge different viewpoints
- Prioritize community well-being

### Unacceptable Behavior

- Harassment or discriminatory language
- Personal attacks or trolling
- Publishing private information
- Spamming or off-topic content
- Any conduct that could reasonably be considered inappropriate

### Reporting

Report violations to: liora.bot.official@gmail.com

All reports will be reviewed promptly and confidentially.

---

## Getting Started

### Prerequisites

- Git
- Bun v1.3.0 or higher
- Text editor or IDE
- Basic understanding of JavaScript/TypeScript
- Familiarity with WhatsApp bot concepts

### Fork and Clone

1. **Fork the repository** on GitHub

2. **Clone your fork**:

    ```bash
    git clone https://github.com/YOUR-USERNAME/liora.git
    cd liora
    ```

3. **Add upstream remote**:

    ```bash
    git remote add upstream https://github.com/naruyaizumi/liora.git
    ```

4. **Verify remotes**:
    ```bash
    git remote -v
    ```

---

## Development Setup

### Install Dependencies

```bash
# Install all dependencies
bun install
```

### Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit configuration
nano .env
```

Required environment variables:

- `PAIRING_NUMBER`: WhatsApp number for pairing
- `PAIRING_CODE`: Code for authentication
- `OWNERS`: Array of owner numbers

### Running Development Server

```bash
# Start in development mode with hot reload
bun run dev
```

### Project Structure

```
liora/
├── src/
│   ├── main.js          # Application entry point
│   ├── handlers.js         # Message and event handlers
│   ├── plugins/          # Bot plugins/commands
│   ├── lib/              # Shared utilities
│   └── database/         # Database models and migrations
└── .env                  # Configuration (git-ignored)
```

---

## How to Contribute

### Reporting Bugs

Before creating a bug report:

1. Check existing issues to avoid duplicates
2. Verify the issue exists in the latest version
3. Collect relevant information

**Bug Report Template**:

```markdown
**Description**
Clear description of the bug

**Steps to Reproduce**

1. Step one
2. Step two
3. Expected vs actual behavior

**Environment**

- OS: [e.g., Ubuntu 24.04]
- Bun version: [e.g., 1.3.5]
- Liora version: [e.g., 10.0.0]

**Additional Context**
Logs, screenshots, or other relevant information
```

### Suggesting Features

Feature suggestions are welcome! Please provide:

- Clear description of the feature
- Use cases and benefits
- Potential implementation approach
- Any relevant examples from other projects

**Feature Request Template**:

```markdown
**Feature Description**
What feature would you like to see?

**Problem Statement**
What problem does this solve?

**Proposed Solution**
How should this feature work?

**Alternatives Considered**
Other approaches you've thought about
```

### First Contribution

Look for issues labeled:

- `good first issue` - Beginner-friendly tasks
- `help wanted` - Tasks needing assistance
- `documentation` - Documentation improvements

---

## Coding Standards

### JavaScript/TypeScript

**Style Guidelines**:

- Use ESM (ES Modules) syntax
- Prefer `const` over `let`, avoid `var`
- Use meaningful variable names
- Keep functions small and focused
- Add JSDoc comments for complex functions
- Use async/await over promises

**Example**:

```javascript
/**
 * Downloads media from a WhatsApp message
 * @param {Object} message - WhatsApp message object
 * @returns {Promise<Buffer>} Downloaded media buffer
 */
async function downloadMedia(message) {
    if (!message.message) {
        throw new Error("Invalid message object");
    }

    // Implementation
    const buffer = await downloadMediaMessage(message);
    return buffer;
}
```

### Code Formatting

We use Prettier for consistent formatting:

```bash
# Install Prettier
bun add -D prettier

# Format all files
bunx prettier --write .

# Check formatting
bunx prettier --check .
```

**Prettier Configuration** (`.prettierrc`):

```json
{
    "semi": true,
    "singleQuote": true,
    "tabWidth": 2,
    "trailingComma": "es5",
    "printWidth": 80
}
```

### Linting

We use ESLint for code quality:

```bash
# Run linter
bunx eslint .

# Fix auto-fixable issues
bunx eslint . --fix
```

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type       | Description      | Example                              |
| ---------- | ---------------- | ------------------------------------ |
| `feat`     | New feature      | `feat(api): add TikTok downloader`   |
| `fix`      | Bug fix          | `fix(auth): resolve session timeout` |
| `docs`     | Documentation    | `docs(readme): update installation`  |
| `style`    | Code style       | `style: format with prettier`        |
| `refactor` | Code refactoring | `refactor(db): simplify query logic` |
| `perf`     | Performance      | `perf(cache): optimize lookup`       |
| `test`     | Tests            | `test(api): add unit tests`          |
| `build`    | Build system     | `build: update dependencies`         |
| `ci`       | CI/CD            | `ci: add GitHub Actions workflow`    |
| `chore`    | Maintenance      | `chore: update .gitignore`           |

### Scope

Common scopes:

- `api` - API integrations
- `auth` - Authentication
- `db` - Database
- `cli` - Command-line interface
- `plugin` - Plugin system
- `deps` - Dependencies
- `config` - Configuration

### Examples

```bash
# Feature
feat(plugin): add image generation command

Add new plugin for AI image generation using DALL-E API.
Includes error handling and rate limiting.

Closes #123

# Bug fix
fix(db): prevent duplicate message processing

Check message ID before processing to avoid duplicates.
Add unique constraint to messages table.

Fixes #456

# Breaking change
feat(auth)!: change authentication flow

BREAKING CHANGE: Sessions now expire after 7 days instead of 30.
Users will need to re-authenticate after updating.

Closes #789
```

---

## Pull Request Process

### Before Submitting

1. **Update your fork**:

    ```bash
    git fetch upstream
    git checkout main
    git merge upstream/main
    ```

2. **Create feature branch**:

    ```bash
    git checkout -b feature/your-feature-name
    ```

3. **Make changes and commit**:

    ```bash
    git add .
    git commit -m "feat(scope): description"
    ```

4. **Run tests**:

    ```bash
    bun test
    ```

5. **Push to your fork**:
    ```bash
    git push origin feature/your-feature-name
    ```

### Submitting PR

1. **Create Pull Request** on GitHub
2. **Fill in the PR template** completely
3. **Link related issues** using keywords (Closes #123)
4. **Request review** from maintainers
5. **Respond to feedback** promptly

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] No new warnings or errors
- [ ] Commit messages follow conventions
- [ ] PR description is clear and complete

### Review Process

1. **Automated checks** run on PR submission
2. **Maintainer review** within 3-5 business days
3. **Address feedback** through new commits
4. **Final approval** by maintainer
5. **Merge** using squash and merge strategy

---

## Testing

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/api.test.js

# Run with coverage
bun test --coverage
```

### Writing Tests

Place tests in `tests/` directory with `.test.js` suffix.

**Example Test**:

```javascript
import { describe, it, expect } from "bun:test";
import { downloadMedia } from "../src/lib/media.js";

describe("Media Download", () => {
    it("should download image successfully", async () => {
        const mockMessage = {
            message: {
                imageMessage: {
                    url: "https://example.com/image.jpg",
                },
            },
        };

        const result = await downloadMedia(mockMessage);
        expect(result).toBeInstanceOf(Buffer);
    });

    it("should throw error for invalid message", async () => {
        expect(async () => {
            await downloadMedia({});
        }).toThrow("Invalid message object");
    });
});
```

### Test Coverage

Aim for:

- **Unit tests**: 80%+ coverage
- **Integration tests**: Critical paths covered
- **E2E tests**: Major features tested

---

## Documentation

### Code Documentation

- Add JSDoc comments to all exported functions
- Document complex algorithms or business logic
- Include usage examples for public APIs

### Project Documentation

When updating features, also update:

- README.md
- API documentation (if applicable)
- Configuration examples
- Migration guides (for breaking changes)

### Documentation Style

- Use clear, concise language
- Include code examples
- Provide context and rationale
- Keep it up-to-date

---

## Recognition

Contributors are recognized through:

- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- GitHub contributor badge
- Special thanks in major releases

---

## Questions?

- **GitHub Issues**: Report bugs with `question` label
- **Email**: liora.bot.official@gmail.com

---

## License

By contributing to Liora, you agree that your contributions will be licensed under the Apache License 2.0.

You retain copyright to your contributions but grant Liora and users the rights specified in the Apache License 2.0.

---

**Thank you for contributing to Liora!**

Made with dedication by the Liora community.
