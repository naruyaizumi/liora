import path, { join } from "path";
import { access } from "fs/promises";
import { watch } from "fs";

/**
 * Initializes a hot-reload system for plugins
 * @param {Object} conn - Connection object with logger
 * @param {string} pluginFolder - Path to the plugins directory
 * @param {Function} getAllPlugins - Function to retrieve all plugin files
 * @returns {Function} Cleanup function to stop watchers and timers
 */
async function initReload(conn, pluginFolder, getAllPlugins) {
    const pluginFilter = (filename) => /\.js$/.test(filename);
    
    global.plugins = {};
    const cleanupFunctions = [];

    /**
     * Loads all plugins from the plugin folder
     */
    async function loadPlugins() {
        let success = 0,
            failed = 0;

        try {
            const files = await getAllPlugins(pluginFolder);

            for (const filepath of files) {
                const filename = path.relative(pluginFolder, filepath);
                try {
                    const file = global.__filename(filepath);
                    
                    const module = await import(`${file}?init=${Date.now()}`);
                    
                    global.plugins[filename] = module.default || module;
                    success++;
                } catch (error) {
                    delete global.plugins[filename];
                    failed++;
                    conn.logger.warn(`Failed to load plugin '${filename}': ${error.message}`);
                }
            }

            conn.logger.info(`Plugins loaded: ${success} OK, ${failed} failed.`);
        } catch (e) {
            conn.logger.error(e.message);
            throw e;
        }
    }

    await loadPlugins().catch(conn.logger.error);

    /**
     * Global reload function to hot-reload individual plugins
     * @param {*} _ev - Event (unused)
     * @param {string} filename - Name of the file to reload
     */
    global.reload = async (_ev, filename) => {
        if (!pluginFilter(filename)) return;

        const normalizedFilename = path.normalize(filename).replace(/\\/g, "/");
        const dir = global.__filename(join(pluginFolder, normalizedFilename), true);

        try {
            await access(dir);
        } catch {
            delete global.plugins[normalizedFilename];
            conn.logger.info(`Plugin removed: ${normalizedFilename}`);
            return;
        }

        try {
            const modulePath = global.__filename(dir);

            const module = await import(`${modulePath}?update=${Date.now()}`);

            global.plugins[normalizedFilename] = module.default || module;
            conn.logger.info(`Reloaded: ${normalizedFilename}`);
        } catch (e) {
            conn.logger.error(e.message);
            conn.logger.error(e.stack);
        }
    };

    Object.freeze(global.reload);

    let debounceTimer = null;
    const debounceDelay = 1000; // Wait 1 second before processing changes
    const pendingReloads = new Map(); // Track files waiting to be reloaded

    /**
     * Debounces reload calls to avoid multiple reloads for rapid file changes
     * @param {string} filename - File to reload
     */
    const debouncedReload = (filename) => {
        pendingReloads.set(filename, Date.now());

        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(async () => {
            const filesToReload = Array.from(pendingReloads.keys());
            
            pendingReloads.clear();

            for (const file of filesToReload) {
                try {
                    await global.reload(null, file);
                } catch (e) {
                    conn.logger.error(e.message);
                }
            }

            debounceTimer = null;
        }, debounceDelay);
    };

    try {
        const watcher = watch(pluginFolder, { recursive: true }, (_event, filename) => {
            // Ignore non-existent files or non-JavaScript files
            if (!filename || !pluginFilter(filename)) return;
            
            debouncedReload(filename);
        });

        cleanupFunctions.push(() => {
            if (watcher) {
                watcher.close();
            }
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
        });

    } catch (e) {
        conn.logger.error(e.message);
    }
    
    return () => {
        cleanupFunctions.forEach((cleanup) => cleanup());
    };
}

export { initReload };