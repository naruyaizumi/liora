# 🧩 Contributing to Liora

Thank you for your interest in contributing to Liora!  
This project is built on principles of modularity, efficiency, and community collaboration. Whether you're submitting code, improving documentation, reporting bugs, or suggesting features — your contributions are highly valued.

---

## 🛠️ Getting Started

To begin contributing:

1. **Fork** this repository
2. **Clone** your fork:
    ```bash
    git clone https://github.com/YOUR-USERNAME/liora.git
    cd liora
    ```
3. **Install dependencies**:
    ```bash
    npm install
    ```
4. **Create a new branch**:
    ```bash
    git checkout -b feature/your-feature-name
    ```
5. **Run the bot locally**:
    ```bash
    npm start
    # or
    node index.js
    ```
6. **Test your changes** before committing

---

## 🧁 Coding Style & Architecture

Liora follows a clean, modular structure. Please adhere to the following guidelines:

### Code Organization

- **Separate concerns**: Keep handlers, logic, and fallback chains distinct
- **Use utilities**: Leverage shared utilities from the `src/` directory where applicable
- **Avoid hardcoding**: No hardcoded paths or file I/O (except for required persistence like auth/store)
- **Fallback chains**: Use fallback API chains for request-based features

### Folder Structure

```
liora/
├── lib/          → Command handlers
├── plugins/      → Feature logic and provider fallbacks
├── src/          → Reusable utilities
└── ...
```

### Code Style

- Use **camelCase** for variables and functions
- Use **PascalCase** for classes
- Use **UPPER_SNAKE_CASE** for constants
- Add **JSDoc comments** for exported functions
- Keep functions **small and focused** (single responsibility)
- Use **async/await** instead of raw promises where possible
- Handle errors gracefully with try-catch blocks

### Example

```javascript
/**
 * Fetches user data with fallback providers
 * @param {string} userId - The user identifier
 * @returns {Promise<Object>} User data object
 */
async function getUserData(userId) {
    try {
        // Primary provider
        return await primaryAPI.getUser(userId);
    } catch (error) {
        // Fallback provider
        return await fallbackAPI.getUser(userId);
    }
}
```

---

## 📝 Commit Guidelines

### Branch Naming Convention

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions or modifications

### Commit Message Format

```
<type>: <subject>

<body (optional)>

<footer (optional)>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Example:**

```
feat: add fallback provider for .hd feature

- Implement secondary API when primary fails
- Add error logging for debugging
- Update tests to cover fallback scenario

Closes #123
```

---

## 🚀 Submitting a Pull Request

### Before Submitting

- [ ] Test your changes locally
- [ ] Ensure no console errors or warnings
- [ ] Update documentation if needed
- [ ] Add tests for new features
- [ ] Follow the coding style guidelines
- [ ] Rebase on latest `main` branch

### PR Guidelines

- Use the appropriate pull request template (ID/EN)
- **Title format**: `[Type] Brief description` (e.g., `[Feature] Add fallback for .hd feature`)
- Include a **clear description** of changes
- Specify **change type** (feature/fix/docs/refactor)
- Reference related **issues** using `Closes #issue-number`
- Add **screenshots** or **examples** if applicable

### Templates

📎 [![Pull Request Template in Indonesian](https://img.shields.io/badge/Pull_Request_Template-Indonesian-0B3D91?style=for-the-badge&logo=github&logoColor=white&labelColor=2F2F2F)](https://github.com/naruyaizumi/liora/blob/main/.github/pull_request_template/pull-request-id.md)

📎 [![Pull Request Template in English](https://img.shields.io/badge/Pull_Request_Template-English-0B3D91?style=for-the-badge&logo=github&logoColor=white&labelColor=2F2F2F)](https://github.com/naruyaizumi/liora/blob/main/.github/pull_request_template/pull-request-us.md)

---

## 🐛 Reporting Bugs

### What to Include

1. **Clear title**: Describe the bug concisely
2. **Steps to reproduce**: Exact steps to trigger the bug
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Environment details**:
    - Node.js version (`node --version`)
    - OS (Linux, Windows, macOS)
    - Bot version
6. **Logs/Screenshots**: Any relevant error messages or screenshots
7. **Additional context**: Any other relevant information

### Templates

📎 [![Bug Report (Indonesian)](https://img.shields.io/badge/Bug_Report-Indonesian-DC143C?style=for-the-badge&logo=github&logoColor=white&labelColor=2F2F2F)](https://github.com/naruyaizumi/liora/issues/new?assignees=&labels=bug&template=bug-report-id.md&title=%5BBUG%5D)

📎 [![Bug Report (English)](https://img.shields.io/badge/Bug_Report-English-DC143C?style=for-the-badge&logo=github&logoColor=white&labelColor=2F2F2F)](https://github.com/naruyaizumi/liora/issues/new?assignees=&labels=bug&template=bug-report-us.md&title=%5BBUG%5D)

---

## 💡 Suggesting Features

We welcome feature suggestions! When proposing a new feature:

1. **Check existing issues** to avoid duplicates
2. **Describe the use case** clearly
3. **Explain the expected behavior**
4. **Provide examples** or mockups if possible
5. **Consider implementation** complexity and maintainability

### Templates

📎 [![Feature Request (Indonesian)](https://img.shields.io/badge/Feature_Request-Indonesian-32CD32?style=for-the-badge&logo=github&logoColor=white&labelColor=2F2F2F)](https://github.com/naruyaizumi/liora/issues/new?assignees=&labels=enhancement&template=feature-request-id.md&title=%5BFEATURE%5D)

📎 [![Feature Request (English)](https://img.shields.io/badge/Feature_Request-English-32CD32?style=for-the-badge&logo=github&logoColor=white&labelColor=2F2F2F)](https://github.com/naruyaizumi/liora/issues/new?assignees=&labels=enhancement&template=feature-request-us.md&title=%5BFEATURE%5D)

---

## 📚 Documentation Contributions

Documentation improvements are always welcome!

### Guidelines

- Add or update content in `README.md` or related docs
- Use **professional markdown formatting**
- Include **emoji section headers** for consistency (🧩 📚 🚀 etc.)
- Provide **usage examples** where relevant
- Keep language **clear and concise**
- Support **both English and Indonesian** where applicable

### Documentation Structure

````markdown
## 🎯 Feature Name

Brief description of the feature.

### Usage

```javascript
// Example code
```

### Parameters

- `param1` (string): Description
- `param2` (number): Description

### Returns

Description of return value
````

---

## 🧪 Testing

### Running Tests

```bash
npm test
```

### Writing Tests

- Add tests for **all new features**
- Ensure **edge cases** are covered
- Use **descriptive test names**
- Follow existing test patterns

### Example Test

```javascript
describe("getUserData", () => {
    it("should fetch user data from primary API", async () => {
        const result = await getUserData("123");
        expect(result).toHaveProperty("id", "123");
    });

    it("should fallback to secondary API on failure", async () => {
        // Test fallback logic
    });
});
```

---

## 🧠 Contribution Philosophy

- **Prioritize stability**: Ensure changes don't break existing functionality
- **Write clear code**: Code should be self-documenting
- **Think modular**: Design components that can be reused and tested independently
- **Maintain long-term**: Consider how changes will age and scale
- **Avoid duplication**: Check for existing solutions before adding new ones
- **Design for community**: Make features accessible and well-documented

---

## 🤝 Community Etiquette

- ✅ **Be respectful and constructive** in all discussions
- ✅ **Provide helpful feedback** on issues and PRs
- ✅ **Ask questions** if something is unclear
- ✅ **Collaborate openly** and share knowledge
- ❌ **Avoid spamming** issues or pull requests
- ❌ **Don't submit untested code**
- ❌ **Don't ignore feedback** from maintainers

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **WhatsApp Group**: Real-time collaboration (link in README)

---

## 📋 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). We are committed to providing a welcoming and inclusive environment for all contributors.

---

## ❓ Need Help?

If you have questions or need assistance:

1. Check the [README.md](README.md) for general information
2. Search [existing issues](https://github.com/naruyaizumi/liora/issues) for similar questions
3. Ask in the WhatsApp community group
4. Open a [discussion](https://github.com/naruyaizumi/liora/discussions) on GitHub

---

## 🎉 Thank You!

Thank you for helping build Liora.  
Your contributions are not just code — they're part of a sustainable, developer-driven ecosystem.

**Every contribution matters**, whether it's:

- 🐛 Fixing a typo
- 📝 Improving documentation
- 🚀 Adding a new feature
- 🧪 Writing tests
- 💡 Suggesting improvements

We appreciate your time and effort in making Liora better for everyone! 🙏
