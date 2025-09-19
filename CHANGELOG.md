## Version 3.7.0 — 2025-09-13

### `Added`
- Officially appears in the next update release cycle.

### `Removed`
- Deprecated features have been removed as they are no longer functional.

### `Fixed`
- Improved reliability for **message sending**.
- Corrected issues with **LID mentions**.
- Resolved several **API-related bugs** to ensure better stability.

## Version 3.7.1 — 2025-09-14 (Patch Update)

### `Added`
- *(No new features in this patch update).*

### `Removed`
- Several non-essential features have been removed to simplify the project.

### `Fixed`
- Improved stability of **exec commands (1–3)**.
- Corrected functionality of **add, kick, promote, and demote** group management commands.

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