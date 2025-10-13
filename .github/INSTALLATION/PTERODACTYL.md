# 🚀 Full Guide: Deploying Liora via Pterodactyl

This documentation explains how to deploy and run **Liora** inside a **Pterodactyl Panel**.  
Because Pterodactyl often does not allow `git clone` directly, the deployment will be done via **ZIP Release Upload**.

---

## 1. Prerequisites

Before starting, make sure your server and Pterodactyl environment meet these requirements:

- Node.js server (recommended version **v22+** for full compatibility)
- At least **1–2 GB RAM** and **5 GB disk space**
- Internet access (to fetch npm dependencies)
- Access to the Pterodactyl panel with file upload & console permissions

---

## 2. Download the Latest Release

1. Go to: [Liora Latest Release](https://github.com/naruyaizumi/liora/releases/latest)
2. Download the **Source Code (ZIP)** package.
3. Keep the file ready for upload to your Pterodactyl server.

---

## 3. Upload & Extract to Pterodactyl

1. Login to your **Pterodactyl Panel**.
2. Open your **Node.js server instance**.
3. Navigate to **Files → Upload**.
4. Upload the previously downloaded `liora.zip`.
5. Once uploaded, select it and **Extract/Unarchive**.
6. Confirm files are extracted properly:
   - `index.js`
   - `package.json`
   - `/lib`, `/plugins`, etc.

---

## 4. Adjust Startup Command

By default, Pterodactyl Node.js egg runs `npm start`.  
We need to install dependencies first.

1. Go to **Startup** section.
2. Change startup command from:

   npm start

   to:

   npm install

3. Save changes.

---

## 5. Install Dependencies

1. Go to **Console**.
2. Start the server → it will run `npm install`.
3. Wait until all packages are installed (may take 1–5 minutes depending on network).
4. Confirm that a `node_modules` folder appears in Files after installation.

---

## 6. Switch Back to Start Command

After dependencies are installed:

1. Go back to **Startup**.
2. Change startup command from:

   npm install

   back to:

   npm start

3. Save.

---

## 7. Recommended Node.js Egg (Optional but Highly Recommended)

For the best stability, use the custom Node.js Egg built for Liora:  
👉 [Custom Node.js Egg (20/22/24, Complete Tools)](https://gist.github.com/naruyaizumi/12a3c6baed67ca7fd7eaa11992c82631)

This Egg provides:

- Based on **Debian 13 Slim**
- Includes `build-essential`, `g++`, `python3`, `make`
- Preinstalled support for native modules like `sharp` and `better-sqlite3`
- Supports multiple package managers (`npm`, `yarn`, `pnpm`)
- Optimized for WhatsApp bots

To use it:

- Replace your current server’s Egg with the provided one.
- Recreate the container (data will persist if mounted correctly).

---

## 8. Start Liora

1. Open **Console** again.
2. Start the server.
3. If first run → pairing QR or pairing code will appear.
4. Scan/pair your WhatsApp account.

🌸 Liora is now running!

---

## 9. Persistent Setup

- Liora will now restart automatically when the server restarts (handled by Pterodactyl).
- Logs can be seen under the **Console** tab.
- If you need live debugging, check console output directly.

---

### 📝 Notes & Best Practices

- Always use **Node.js v22+** for long-term support.
- If memory usage is high, allocate at least **2 GB RAM**.
- Regularly update dependencies:  
  npm update

- To reinstall everything:  
  delete `node_modules` and `package-lock.json`, then run `npm install`.

---

🔒 With this setup, Liora should run smoothly in **Pterodactyl**, with proper dependency handling, environment configuration, and startup logic.
