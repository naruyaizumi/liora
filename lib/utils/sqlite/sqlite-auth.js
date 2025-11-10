import { initAuthCreds } from "baileys";
import core from "./database-core.js";
import { logger, makeKey, validateKey } from "./database-config.js";

export function SQLiteAuth(_dbPath, _options) {
    let creds;

    try {
        const row = core.get("creds");
        if (row?.value) {
            creds = row.value;
            if (!creds || typeof creds !== "object") {
                logger.warn({ context: "SQLiteAuth: invalid creds, reinitializing" });
                creds = initAuthCreds();
            }
        } else {
            creds = initAuthCreds();
        }
    } catch (e) {
        logger.error({ err: e.message, context: "SQLiteAuth init" });
        creds = initAuthCreds();
    }

    const keys = {
        async get(type, ids) {
            if (!type || !Array.isArray(ids)) {
                logger.warn({ type, ids, context: "keys.get: invalid params" });
                return {};
            }

            const out = {};
            const missing = [];

            for (const id of ids) {
                const k = makeKey(type, id);
                if (!validateKey(k)) continue;

                let v = core.cache.get(k);

                if (v === undefined) {
                    missing.push({ id, k });
                } else if (v !== null) {
                    out[id] = v;
                }
            }

            if (missing.length > 0) {
                for (const { id, k } of missing) {
                    try {
                        const row = core.get(k);
                        const v = row?.value ?? null;

                        core.cache.set(k, v);
                        if (v !== null) {
                            out[id] = v;
                        }
                    } catch (e) {
                        logger.error({ err: e.message, key: k, context: "keys.get" });
                    }
                }
            }

            return out;
        },

        async set(data) {
            if (!data || typeof data !== "object") {
                logger.warn({ context: "keys.set: invalid data" });
                return;
            }

            for (const type in data) {
                const bucket = data[type];
                if (!bucket || typeof bucket !== "object") continue;

                for (const id in bucket) {
                    try {
                        const v = bucket[id];
                        const k = makeKey(type, id);

                        if (!validateKey(k)) {
                            logger.warn({ key: k, context: "keys.set: invalid key" });
                            continue;
                        }

                        if (v === null || v === undefined) {
                            core.cache.del(k);
                            core.del(k);
                        } else {
                            core.cache.set(k, v);
                            core.set(k, v);
                        }
                    } catch (e) {
                        logger.error({ err: e.message, type, id, context: "keys.set" });
                    }
                }
            }
        },

        async clear() {
            try {
                logger.info({ context: "keys.clear: clearing all keys" });
            } catch (e) {
                logger.error({ err: e.message, context: "keys.clear" });
            }
        },
    };

    function saveCreds() {
        try {
            if (!creds || typeof creds !== "object") {
                logger.error({ context: "saveCreds: invalid creds" });
                return false;
            }

            core.set("creds", creds);
            return true;
        } catch (e) {
            logger.error({ err: e.message, context: "saveCreds" });
            return false;
        }
    }

    return {
        state: { creds, keys },
        saveCreds,
        _dispose: async () => {
            try {
                await core.flush();
            } catch (e) {
                logger.error({ err: e.message, context: "_dispose" });
            }
        },
        db: core.db,
        get closed() {
            return core.disposed;
        },
    };
}
