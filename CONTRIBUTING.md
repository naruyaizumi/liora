# 🧩 Contributing to Liora

Thank you for your interest in contributing to Liora!  
This project is built on principles of modularity, efficiency, and community collaboration. Whether you're submitting code, improving documentation, reporting bugs, or suggesting features — your contributions are highly valued.

---

## 🛠️ Getting Started

To begin contributing:

1. **Fork** this repository
2. **Clone** your fork:  
   `git clone https://github.com/<your-username>/liora.git`
3. **Install dependencies**:  
   `npm install`
4. **Run the bot locally**:  
   `npm start` or `node main.js`
5. **Create a new branch** for your changes:  
   `git checkout -b feature/your-branch-name`

---

## 🧁 Coding Style & Architecture

Liora follows a clean, modular structure. Please adhere to the following guidelines:

- Separate handlers, logic, and fallback chains
- Use `liora-lib` utilities where applicable
- Avoid hardcoded paths or file I/O (except for required persistence like auth/store)
- Use fallback API chains for request-based features
- Follow the folder structure:
  - `handler/` → command handlers
  - `api/` → feature logic and provider fallbacks
  - `lib/` → reusable utilities
  - `store/` → persistent data
  - `docs/` → documentation

---

## 🚀 Submitting a Pull Request

- Use the appropriate pull request template (ID/EN)
- Title format: `[PR] Add fallback for .hd feature`
- Include a clear description, change type, and checklist
- Ensure your code is tested and error-free

📎 [Pull Request (Indonesian)](https://github.com/naruyaizumi/liora/compare?expand=1&template=pull-request-id.md)  
📎 [Pull Request (English)](https://github.com/naruyaizumi/liora/compare?expand=1&template=pull-request-us.md)

---

## 🐛 Reporting Bugs

- Use the appropriate issue template (ID/EN)
- Provide reproduction steps, logs, and environment details

📎 [Bug Report (Indonesian)](https://github.com/naruyaizumi/liora/issues/new?assignees=&labels=bug&projects=&template=bug-report-id.md&title=%5BBUG%5D)  
📎 [Bug Report (English)](https://github.com/naruyaizumi/liora/issues/new?assignees=&labels=bug&projects=&template=bug-report-us.md&title=%5BBUG%5D)

---

## ✨ Adding New Features

- Place logic in `api/feature.js` if it involves external APIs
- Use fallback chains for multi-provider support
- Avoid modifying `main.js` directly unless updating core loaders
- Update documentation if the feature impacts usage

---

## 📚 Documentation Contributions

- Add or update content in `README.md` or `docs/`
- Use professional markdown formatting with emoji section headers
- Include usage examples where relevant

---

## 🧠 Contribution Philosophy

- Prioritize stability, clarity, and modularity
- Ensure all contributions are maintainable long-term
- Avoid duplicating existing features
- Design with community adoption in mind

---

## 🤝 Community Etiquette

- Be respectful and constructive in discussions
- Avoid spamming issues or pull requests
- Use the WhatsApp group for open collaboration
- All contributions will be reviewed fairly and transparently

---

Thank you for helping build Liora.  
Your contributions are not just code — they’re part of a sustainable, developer-driven ecosystem.