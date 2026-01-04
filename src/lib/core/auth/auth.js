import { initAuthCreds } from "baileys";
import core, { parse, makeKey } from "./core.js";

function createKeyStore() {
  async function _getMany(type, ids) {
    if (ids.length === 0) return {};

    const keys = ids.map(id => makeKey(type, id));
    
    const results = await core.getMany(keys);
    
    const out = {};
    for (const id of ids) {
      const k = makeKey(type, id);
      const row = results[k];
      
      if (row && row.value) {
        const v = parse(row.value);
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

    const promises = [];
    
    if (Object.keys(flatData).length > 0) {
      promises.push(core.setMany(flatData));
    }

    if (keysToDelete.length > 0) {
      promises.push(core.deleteMany(keysToDelete));
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }

  async function transaction(work) {
    try {
      const result = await work();
      return result;
    } catch (e) {
      global.logger?.error(`Transaction error: ${e.message}`);
      throw e;
    }
  }

  async function clear() {
    try {
      const db = core.db;
      await db`DELETE FROM baileys_state WHERE key LIKE '%-%'`;
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
      //
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

  async function saveCreds() {
    if (core.isHealthy()) {
      await core.set("creds", creds);
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