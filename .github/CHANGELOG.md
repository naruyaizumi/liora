# Version 6.0.0 — Major Release

## Added
- **TikTok v2 Downloader** with improved reliability.  
- **Compress (Sharp-based)** for smarter image compression without quality loss.  

## Removed
- **InteractiveButton** (deprecated in Baileys 7.x).  
- Dependencies: *awesome-phonenumber*, *ytsearch*.  
- **Album message** (unstable in current Baileys).  
- **Media search** (deprecated).  
- **Unused features** and legacy code.  
- **Write on Paper (ImageMagick)** feature (removed for simplification).  

## Fixed
- Full **Migration to LID** (native IDs).  
- Optimized API results for faster responses.  
- Improved **Canvas rendering** for welcome banners.  
- Linter compliance across codebase.  
- Database migration stability.  
- **Bad decrypt** issue in Baileys.  
- Minimalized code for performance and readability.  

---

> [!NOTE]  
> This release ensures better stability and simplified code by removing unused features and aligning with the latest Baileys 7.x.x breaking changes.

# Version 5.0.0 — Major Release

## Added
- **Media Uploader v8** with enhanced performance and reliability.  
- New visual transformation tools: *Cartoon, Comic, Cyber, Disney, Ghibli, Pixar, Figure, SDM Tinggi, Hijab, Black & White*.  
- **iPhone-style Quote Chat** rendering.  
- **Navigation** for improved command flow and usability.  
- **Native Banner Rendering (Canvas-based)** for lightweight and efficient banners.  
- **Native Sticker Maker (C++)** for faster and more stable sticker generation.  
- **Native Converter (C++)** supporting extended audio/video transformations.  
- **Automatic Sticker Cropping** to ensure output meets WhatsApp constraints without loss of quality.  

## Removed
- Deprecated **Premium system**.  
- **Otakkudesu module** (unmaintained).  
- Generic **scrape** and **cheerio-based scrapers**.  
- Legacy database fields (`data`, `chat`, `user`).  
- **Yargs-based CLI commands**.  
- Deprecated **LID mapping in getters** (fully replaced with JID normalization).  
- **node-webpmux**, replaced by an internal native Exif handler.  

## Fixed
- Sticker box padding and layout alignment.  
- Refactored **media uploader** for stability.  
- Improved `toAnime` and `toGTA` visual generators.  
- Stability fixes for **smeme** generation.  
- Updated compatibility with latest **Baileys** core.  
- Optimized **Native Cron (C++)**, improving task scheduling performance.  
- Automatic save and migration for **SQLite database**.  
- Corrected converter reliability for audio and PTT output.  
- Enhanced **ATTP** rendering for consistent results.  
- Fixed watermark application logic.  
- Resolved issues in **native JID store** mapping.  
- Migrated **Exif metadata** handling to fully native C++.  
- Optimized audio conversion flows: `toMP3` and `toPTT`.  
- Refined **global loading indicator** for natural user experience.  
- Full **linter compliance** and codebase cleanup.  
- Updated **Pino** logging library: v9.13.1 → v10.0.0.  

---

> [!IMPORTANT]  
> Additional C++ tool bindings require a compatible Pterodactyl Egg.  
> Recommended: [Liora Node.js Egg](https://gist.github.com/naruyaizumi/12a3c6baed67ca7fd7eaa11992c82631)