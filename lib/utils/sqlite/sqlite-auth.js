/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import { initAuthCreds } from "baileys";
import core from "./database-core.js";
import {
    logger,
    parse,
    makeKey,
} from "./database-config.js";

export function SQLiteAuth(_dbPath, _options) {
    let creds;
    try {
        const row = core.get("creds");
        if (row && row.value) {
            creds = parse(row.value) || initAuthCreds();
        } else {
            creds = initAuthCreds();
        }
    } catch (e) {
        logger.error(e.message);
        creds = initAuthCreds();
    }

    const keys = {
        async get(type, ids) {
            const out = {};
            const missing = [];

            for (const id of ids) {
                const k = makeKey(type, id);
                let v = core.cache.get(k);
                
                if (v === undefined) {
                    missing.push({ id, k });
                } else if (v !== null) {
                    out[id] = v;
                }
            }

            if (missing.length > 0) {
                for (const { id, k } of missing) {
                    const row = core.get(k);
                    const v = row ? parse(row.value) : null;
                    
                    core.cache.set(k, v);
                    if (v !== null) {
                        out[id] = v;
                    }
                }
            }
            return out;
        },
        
        async set(data) {
            for (const type in data) {
                const bucket = data[type];
                for (const id in bucket) {
                    const v = bucket[id];
                    const k = makeKey(type, id);
                    if (v === null || v === undefined) {
                        core.cache.del(k);
                        core.del(k);
                    } else {
                        core.cache.set(k, v);
                        core.set(k, v);
                    }
                }
            }
        },
        
        async clear() {
        },
    };
    
    function saveCreds() {
        core.set("creds", creds);
    }
    
    return {
        state: { creds, keys },
        saveCreds,
        _dispose: async () => {},
        db: core.db,
        get closed() { return core.disposed; },
    };
}
