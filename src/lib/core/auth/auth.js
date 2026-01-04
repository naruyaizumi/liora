import { initAuthCreds } from "baileys";
import core, { parse, makeKey } from "./core.js";

function createKeyStore() {
    async function _getMany(type, ids) {
        const out = {};
        const missing = [];

        for (const id of ids) {
            const k = makeKey(type, id);
            missing.push({ id, k });
        }

        if (missing.length > 0) {
            for (const { id, k } of missing) {
                const row = await core.get(k);
                const v = row ? parse(row.value) : null;
                
                if (v !== null) {
                    out[id] = v;
                }
            }
        }

        return out;
    }

    async function get(type, ids) {
        return _getMany(type, ids);
    }

    async function set(data) {
        const flatData = {};
        const keysToDelete = [];
        
        for (const type in data) {
            const bucket = data[type] || {};
            for (const id in bucket) {
                const v = bucket[id];
                const k = makeKey(type, id);
                
                if (v === null || v === undefined) {
                    keysToDelete.push(k);
                } else {
                    flatData[k] = v;
                }
            }
        }

        if (Object.keys(flatData).length > 0) {
            await core.setMany(flatData);
        }

        if (keysToDelete.length > 0) {
            await core.deleteMany(keysToDelete);
        }
    }

    async function transaction(work) {
        try {
            const result = await work();
            await core.flush();
            return result;
        } catch (e) {
            global.logger?.error(`Transaction error: ${e.message}`);
            throw e;
        }
    }

    async function clear() {
        try {
            await core.flush();
            
            const db = core.db;
            await db.begin(async (tx) => {
                await tx`DELETE FROM baileys_state WHERE key LIKE '%-%'`;
            });
        } catch (e) {
            global.logger?.error(`Clear error: ${e.message}`);
            throw e;
        }
    }

    return {
        get,
        set,
        clear,
        transaction,
        _dispose: async () => {
            await core.flush();
        },
    };
}

export async function useSQLAuthState() {
    let creds;
    
    async function loadCreds() {
        try {
            const row = await core.get("creds");
            if (row && row.value) {
                creds = parse(row.value) || initAuthCreds();
            } else {
                creds = initAuthCreds();
            }
        } catch (e) {
            global.logger?.error(`Load creds error: ${e.message}`);
            creds = initAuthCreds();
        }
    }

    await loadCreds();

    const keyStore = createKeyStore();

    const keys = {
        async get(type, ids) {
            return keyStore.get(type, ids);
        },

        async set(data) {
            return keyStore.set(data);
        },

        async clear() {
            return keyStore.clear();
        },
    };

    function saveCreds() {
        if (core.isHealthy()) {
            core.set("creds", creds);
        }
    }

    async function dispose() {
        try {
            await keyStore._dispose();
            await core.dispose();
        } catch (e) {
            global.logger?.error(`Auth dispose error: ${e.message}`);
        }
    }

    return {
        state: { creds, keys },
        saveCreds,
        dispose,
        get closed() {
            return core.disposed;
        },
    };
}