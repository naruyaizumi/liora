import { initAuthCreds, proto } from "baileys";
import core, { makeKey } from "./core.js";
import {
  encode as msgpackEncode,
  decode as msgpackDecode,
} from "@msgpack/msgpack";

function encodeAuthCreds(creds) {
  return msgpackEncode(creds);
}

function decodeAuthCreds(buf) {
  return msgpackDecode(buf);
}

function createKeyStore() {
  return {
    async get(type, ids) {
      if (ids.length === 0) return {};

      const keys = ids.map((id) => makeKey(type, id));
      const results = await core.getMany(keys);

      const out = {};
      for (const id of ids) {
        const k = makeKey(type, id);
        const buf = results[k];

        if (buf) {
          if (type === "app-state-sync-key") {
            try {
              out[id] = proto.Message.AppStateSyncKeyData.decode(buf);
            } catch (e) {
              global.logger?.error(`Decode error for ${k}: ${e.message}`);
            }
          } else {
            out[id] = buf;
          }
        }
      }

      return out;
    },

    async set(data) {
      const toSet = {};
      const toDelete = [];

      for (const type in data) {
        for (const id in data[type]) {
          const value = data[type][id];
          const key = makeKey(type, id);

          if (!value) {
            toDelete.push(key);
            continue;
          }

          if (type === "app-state-sync-key") {
            try {
              const encoded =
                proto.Message.AppStateSyncKeyData.encode(value).finish();
              toSet[key] = encoded;
            } catch (e) {
              global.logger?.error(`Encode error for ${key}: ${e.message}`);
            }
          } else {
            toSet[key] =
              value instanceof Uint8Array ? value : new Uint8Array(value);
          }
        }
      }

      const promises = [];

      if (Object.keys(toSet).length > 0) {
        promises.push(core.setMany(toSet));
      }

      if (toDelete.length > 0) {
        promises.push(core.deleteMany(toDelete));
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
    },

    async clear() {
      try {
        await core.db`DELETE FROM baileys_keys WHERE k LIKE '%:%'`;
      } catch (e) {
        global.logger?.error(`Clear error: ${e.message}`);
      }
    },
  };
}

export async function useSQLAuthState() {
  let creds;

  async function loadCreds() {
    try {
      const buf = await core.get("creds");

      if (buf) {
        creds = decodeAuthCreds(buf);
      } else {
        creds = initAuthCreds();
      }
    } catch (e) {
      global.logger?.error(`Load creds error: ${e.message}`);
      creds = initAuthCreds();
    }
  }

  await loadCreds();

  const keys = createKeyStore();

  async function saveCreds() {
    if (!core.isHealthy()) return;

    try {
      const buf = encodeAuthCreds(creds);
      await core.set("creds", buf);
    } catch (e) {
      global.logger?.error(`Save creds error: ${e.message}`);
    }
  }

  async function dispose() {
    try {
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
