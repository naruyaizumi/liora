## Version 4.0.0 — 2025-09-19 (Major Update)

### `Added`

- New **Tool-Stalking** feature.
- **Pinterest Downloader**.
- **YouTube Video v2**.
- **YouTube Audio v2**.
- **Converter utilities**.

### `Removed`

- Legacy **AI Enhanced**.
- Old **YouTube Downloader (ytdl)**.
- **ytplay** command.
- **TikTok v2**.
- All **NSFW modules**.
- Deprecated getters (`getFile`, `sendContact`, button & unused getters).
- **setpp landscape**.
- RPG-related modules (**Dungeon**, **Werewolf**, **Fun Games Menu**).
- **Anti ViewOnce**.
- **Donasi**, **Menfess**, **Prototype**, **Audio Effect**.
- Third-party scrapers (**CapCut**, **Facebook**, **Terabox**).
- Unused APIs & CLI options (flag CLI, scrape unused).
- Hardcoded logic & LID–JID normalization.
- Several unused modules.

### `Fixed`

- Corrected **getName** behavior.
- Improved **Anti-Link** detection.
- Fixed downloaders (**MediaFire**, **Videy**, **Twitter**, **StalkWA**, **APK Downloader**).
- Enhanced core functions for **Node.js 22+**.
- Adjusted **Maker & Scraper** functions.
- Refactored **all plugins** for better maintainability.
- Synchronized **API changes** (MediaFire + GDrive + Videy).
- Fixed object getters & **decode JID**.
- Improved **quoted message handling** (now resolves LID → JID properly).
- Fixed **audio PTT sending** (voice notes now work reliably).
- Database initialization & global settings improvements.
- Improved **menu system**.
- Full **Linter compliance (100%)**.
- Refactored **plugin structure**.
- Fixed `ERR_INVALID_ARG_TYPE` issues.
- Optimized **broadcast** & **hidetag** with better filtering logic.
- Dependency optimizations & bug fixes.

---

## Version 4.0.3 — 2025-09-21 (Patch Update)

### `Added`

- Automatic **self-update system** (auto check & pull updates).

### `Removed`

- _(No features removed in this patch update)._

### `Fixed`

- Improved **MP3 handling**.
- Fixed **PTT (Push-to-Talk / voice notes)** reliability.

---

## Version 4.1.0 — (Minor Update)

### `Added`

- **cekreso** command.
- **resize** image handler.
- **SQLite database** (replacing lowdb).
- **Native cron (C++ based)** for scheduling.

### `Removed`

- Tag owner (command cleanup).
- Lowdb (migrated to SQLite).
- Node-cron (migrated to native C++).
- wa-sticker-js (replaced by ffmpeg + webpmux).
- Exif module (replaced by custom logic).

### `Fixed`

- Uploader stability.
- Security in fetch requests.
- Import path resolution.
- Tool syntax consistency.
- Resize + resolution handler.
- Getter media handling.
- Converter (MP3/PTT improvements).
- Binding CPP stability.
- Refactor sticker logic (now stable and scalable).
