# Version 7.2.1 — Patch Update

## Fixed

- **Stability Improvements** — resolved several minor bugs introduced in version **7.2.0** that affected socket initialization and helper synchronization.  
- **Dependency Handling** — corrected issues with `liora-lib` integration to ensure smoother native module loading across environments.  
- **Internal Error Handling** — improved resilience of startup routines and fixed occasional crashes during runtime initialization.

---

# Version 7.2.0 — Minor Update

## Added

- **Helper Socket** — introduced a modular helper layer to streamline socket management and improve maintainability.  
- **Liora-lib Dependency** — integrated the new `liora-lib` native library for optimized performance and simplified native operations.

---

## Removed

- **Redundant Protocols** — deprecated legacy protocol routines to reduce complexity.  
- **Silent Subtype Message** — removed unused subtype message handling for cleaner event flow.  
- **Nested Try-Catch / If-Else** — refactored deeply nested logic into clearer, modular structures.  
- **Native C++ Add-on** — eliminated the old C++ native layer, fully migrated to `liora-lib`.

---

## Fixed

- **makeWASocket, Serialise, smsg, and Prototype** — improved internal consistency, performance, and reliability across these core utilities.  
- **Socket Store Implementation** — enhanced the integration and stability of the store system within the socket layer.

---

# Version 7.1.0 — Minor Update

## Added

- **Upload Channel** — added native support for posting media and messages directly to WhatsApp Channels.
- **Upload Mentioned Status** — allows sending status updates with user mentions.
- **Bing Image Search** — integrated Bing API for fast, accurate image search results.
- **WikiMedia Search** — added WikiMedia image and article lookup support.
- **Pinterest Search** — implemented Pinterest crawler for visual content discovery.
- **Anti Mentioned Status** — prevents users from tagging bot or owner in WhatsApp statuses.
- **YTS Package** — lightweight YouTube Search module for fast metadata and video lookup.

---

## Removed

- **Audio Decoder Module** — removed legacy decoder to reduce binary overhead.
- **C++ Convert Warning Logs** — suppressed redundant native bridge logs for cleaner output.
- **Deprecated Convert Routines** — eliminated old redundant conversion logic replaced by native bridge.

---

## Fixed

- **Play Button (Interactive Message)** — fixed delayed playback response on interactive media messages.
- **Auth + Store (SQLite)** — stabilized authentication and persistent storage synchronization.
- **Album Message Delivery** — resolved multi-image/video grouping errors.
- **CTA Copy Button** — restored proper clipboard copy behavior in call-to-action templates.
- **Resolve ID ⇄ LID** — improved mapping accuracy between JID and LID in multi-device environments.
- **Baileys Migration** — synchronized compatibility with latest Baileys core changes.
- **SQLite Memory Store** — optimized memory mode for improved read/write performance.

---

# Version 7.0.0 — Major System Rewrite

## Added

- Async migration across codebase using `fs/promises` API for non-blocking I/O.
- Refactored `chats` table schema with explicit defaults and unified data types.
- Native `sendAlbum()` support for multi-media (image/video) message threads.
- Native audio bridge (`convert()` via Node-API) replacing external ffmpeg.
- Debounced Plugin Reloader powered by native C++ cron bridge.
- Graceful Shutdown & Crash Cooldown system for stable runtime supervision.
- Linux-style CLI interface with uniform separators and clean headers.
- **Native C++ Fetch Bridge** — implemented using `libcurl` with full HTTP/2 optimization and memory-safe buffer management, replacing Node’s built-in fetch for higher performance and lower latency across network requests.
- **FormData & Blob Support in Native Fetch** — added complete multipart/form-data compatibility to native C++ bridge, enabling seamless upload of binary payloads and buffers directly from Node.js without third-party polyfills.
- **Uploader System Refactor** — all uploader functions (`uploader1–uploader8`) now use native `FormData` and `Blob` APIs (no external `form-data` dependency) ensuring better compatibility with the C++ fetch bridge and reduced JS overhead.
- **SQL-based Authentication Layer** — replaced `useMultiFileAuthState` with `SQLiteAuth()` for a more durable, corruption-resistant Baileys session store powered by `better-sqlite3`.
- **Refactored Store System (`store.bind`)** — fully rebuilt for Baileys v7 compatibility:
    - Event-safe, idempotent, and memory-leak-free binding.
    - Group metadata caching with TTL and inflight deduplication.
    - Message trimming with automatic per-chat memory control.
    - Eliminated redundant listeners and reduced event overhead.
- Reduced console verbosity with cleaner, categorized runtime logs for better readability.

---

## Removed

- All blocking `fs.*Sync` calls and redundant synchronous logic.
- Legacy reload loop logic replaced by debounced watcher.
- ffmpeg subprocess dependency for audio conversion.
- Emoji-based UI formatting and inconsistent ASCII borders.
- Old multi-file session handler (`useMultiFileAuthState`) replaced with single-file `auth.db` managed through SQLite.
- Deprecated store event system replaced with modern, safe `bind(conn)` implementation.
- Third-party `form-data` dependency — replaced by native Blob/FormData implementation integrated with the C++ fetch bridge.

---

## Fixed

- Prevented NULL and type-mismatch issues in database initialization.
- Eliminated redundant plugin reloads during multiple file saves.
- Solved I/O blocking on concurrent file operations.
- Improved MIME detection and fallback handling in `sendFile()`.
- Stabilized process restarts with smart cooldown (5 × crash → pause 5 min).
- Optimized in-memory cleanup for temporary media buffers.
- Unified timestamp and output layout across all command replies.
- Rewrote fetch handling layer to use `bridge.js` as a single entrypoint — improving consistency, cancellation control, and reducing JS overhead during parallel HTTP operations.
- Added Blob/FormData handling in native fetch to fix broken uploads for `uploader()`, `uploader2()`, and related functions.
- Fixed race conditions during concurrent plugin reloads and database checkpoints.
- Fixed group metadata duplication and stale cache issues in `store.bind`.
- Minor stability patches and consistency fixes across async handlers.

---

## Summary

Version 7 introduces a **complete internal refactor** focused on stability, speed, and maintainability.

- Fully async core (Promise-based I/O)
- Rebuilt database and media engine
- Native runtime supervision
- SQLite-based authentication for Baileys session
- **Native C++ HTTP bridge with full Blob/FormData upload support**
- Clean, minimal Linux-style console output
- Optimized event handling, plugin reloader, and store binding system

---

_Liora 7.0.0 marks the transition from mixed async/sync architecture to a fully native async environment, combining Node.js performance with native C++ bridges for near-zero latency operations and seamless binary data handling._

---

# Version 6.0.0 — Major Release

## Added

- **TikTok v2 Downloader** with improved reliability.
- **Compress (Sharp-based)** for smarter image compression without quality loss.

## Removed

- **InteractiveButton** (deprecated in Baileys 7.x).
- Dependencies: _awesome-phonenumber_, _ytsearch_.
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
- New visual transformation tools: _Cartoon, Comic, Cyber, Disney, Ghibli, Pixar, Figure, SDM Tinggi, Hijab, Black & White_.
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
