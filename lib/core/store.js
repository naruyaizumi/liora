import pino from 'pino';

const logger = pino({
  level: 'info',
  base: { module: 'STORE' },
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
});

const chatCache = new Map();
const MAX_CACHE_SIZE = 500;
const DEFAULT_TTL = 60 * 60 * 1000;
const accessOrder = new Map();
let accessCounter = 0;

function cleanupCache() {
  const now = Date.now();
  const keysToDelete = [];

  for (const [key, value] of chatCache.entries()) {
    if (value.expiry < now) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    chatCache.delete(key);
    accessOrder.delete(key);
  }

  if (chatCache.size > MAX_CACHE_SIZE) {
    const sortedKeys = Array.from(accessOrder.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([key]) => key);

    const excessCount = chatCache.size - MAX_CACHE_SIZE;
    for (let i = 0; i < excessCount && i < sortedKeys.length; i++) {
      const key = sortedKeys[i];
      if (chatCache.has(key)) {
        chatCache.delete(key);
        accessOrder.delete(key);
      }
    }
  }

  logger.debug(
    { cacheSize: chatCache.size, deletedCount: keysToDelete.length },
    'Cache cleanup completed'
  );
}

function setCache(key, value, ttl = DEFAULT_TTL) {
  if (!key) {
    logger.warn('Attempted to set cache with null/undefined key');
    return;
  }

  const expiry = Date.now() + ttl;
  chatCache.set(key, {
    value,
    expiry,
    lastAccessed: Date.now(),
  });

  accessOrder.set(key, ++accessCounter);

  if (chatCache.size > MAX_CACHE_SIZE) {
    cleanupCache();
  }
}

function getCache(key) {
  if (!key) return undefined;

  const cached = chatCache.get(key);
  if (!cached) {
    return undefined;
  }

  if (cached.expiry < Date.now()) {
    chatCache.delete(key);
    accessOrder.delete(key);
    return undefined;
  }

  accessOrder.set(key, ++accessCounter);
  cached.lastAccessed = Date.now();

  return cached.value;
}

function syncCacheToChats(conn) {
  if (!conn || !conn.chats) return;

  try {
    const cacheKeys = new Set(chatCache.keys());
    const chatKeys = Object.keys(conn.chats);
    
    for (const key of chatKeys) {
      const cached = chatCache.get(key);
      if (!cached && key !== 'status@broadcast') {
        delete conn.chats[key];
      }
    }

    logger.debug(
      { cacheSize: cacheKeys.size, chatsSize: chatKeys.length },
      'Synced cache to chats'
    );
  } catch (e) {
    logger.error({ err: e }, 'Error syncing cache to chats');
  }
}

export default function bind(conn) {
  if (!conn.chats) conn.chats = {};

  let syncInterval = null;
  let isCleanedUp = false;

  syncInterval = setInterval(() => {
    if (!isCleanedUp) {
      syncCacheToChats(conn);
      cleanupCache();
    }
  }, 5 * 60 * 1000);

  function updateNameToDb(contacts) {
    if (!contacts || isCleanedUp) return;
    
    try {
      let contactArray;
      if (Array.isArray(contacts)) {
        contactArray = contacts;
      } else if (contacts.contacts) {
        contactArray = Array.isArray(contacts.contacts) 
          ? contacts.contacts 
          : [contacts.contacts];
      } else {
        contactArray = [contacts];
      }
      
      for (const contact of contactArray) {
        if (!contact || !contact.id) continue;
        
        const id = conn.decodeJid(contact.id);
        if (!id || id === 'status@broadcast') continue;

        const existingChats = getCache(id) || { id };
        const isGroup = id.endsWith('@g.us');

        const update = {
          ...existingChats,
          ...contact,
          id,
        };

        if (isGroup) {
          const newSubject = contact.subject || contact.name || existingChats.subject || '';
          if (newSubject) {
            update.subject = newSubject;
          }
        } else {
          const newName = contact.notify || contact.name || existingChats.name || existingChats.notify || '';
          if (newName) {
            update.name = newName;
          }
        }

        setCache(id, update);
        conn.chats[id] = update;
      }
    } catch (e) {
      logger.error({ err: e, fn: 'updateNameToDb' }, 'Error updating contacts to DB');
    }
  }

  conn.ev.on('contacts.upsert', updateNameToDb);
  conn.ev.on('contacts.set', updateNameToDb);

  conn.ev.on('chats.set', async ({ chats: chatsUpdate }) => {
    if (isCleanedUp) return;
    
    try {
      for (let { id, name, readOnly } of chatsUpdate) {
        id = conn.decodeJid(id);
        if (!id || id === 'status@broadcast') continue;

        const existingChats = getCache(id) || { id };
        const isGroup = id.endsWith('@g.us');
        
        const chats = {
          ...existingChats,
          isChats: !readOnly,
        };

        if (name) {
          chats[isGroup ? 'subject' : 'name'] = name;
        }

        if (isGroup) {
          try {
            const metadata = await conn.groupMetadata(id);
            if (metadata) {
              chats.subject = name || metadata.subject;
              chats.metadata = metadata;
            }
          } catch (err) {
            logger.debug({ err, id }, 'Failed to fetch group metadata');
          }
        }

        setCache(id, chats);
        conn.chats[id] = chats;
      }
    } catch (e) {
      logger.error({ err: e, fn: 'chats.set' }, 'Error in chats.set handler');
    }
  });

  conn.ev.on('group-participants.update', async function updateParticipantsToDb({ id }) {
    if (isCleanedUp) return;
    
    try {
      if (!id) return;
      id = conn.decodeJid(id);
      if (id === 'status@broadcast') return;

      const existingChats = getCache(id) || { id };
      const chats = {
        ...existingChats,
        isChats: true,
      };

      try {
        const groupMetadata = await conn.groupMetadata(id);
        if (groupMetadata) {
          chats.subject = groupMetadata.subject;
          chats.metadata = groupMetadata;
        }
      } catch (err) {
        logger.debug({ err, id }, 'Failed to fetch group metadata');
      }

      setCache(id, chats);
      conn.chats[id] = chats;
    } catch (e) {
      logger.error({ err: e, fn: 'group-participants.update' }, 'Error updating participants');
    }
  });

  conn.ev.on('groups.update', async function groupUpdatePushToDb(groupsUpdates) {
    if (isCleanedUp) return;
    
    try {
      const updatesArray = Array.isArray(groupsUpdates) ? groupsUpdates : [groupsUpdates];
      
      for (const update of updatesArray) {
        if (!update || !update.id) continue;
        
        const id = conn.decodeJid(update.id);
        if (!id || id === 'status@broadcast') continue;

        const isGroup = id.endsWith('@g.us');
        if (!isGroup) continue;

        const existingChats = getCache(id) || { id };
        const chats = {
          ...existingChats,
          isChats: true,
        };

        try {
          const metadata = await conn.groupMetadata(id);
          if (metadata) {
            chats.metadata = metadata;
            chats.subject = update.subject || metadata.subject;
          } else if (update.subject) {
            chats.subject = update.subject;
          }
        } catch (err) {
          logger.debug({ err, id }, 'Failed to fetch group metadata');
          if (update.subject) {
            chats.subject = update.subject;
          }
        }

        setCache(id, chats);
        conn.chats[id] = chats;
      }
      
      updateNameToDb(updatesArray);
    } catch (e) {
      logger.error({ err: e, fn: 'groups.update' }, 'Error in groups.update handler');
    }
  });

  conn.ev.on('chats.upsert', function chatsUpsertPushToDb(chatsUpsert) {
    if (isCleanedUp) return;
    
    try {
      const chatsArray = Array.isArray(chatsUpsert) ? chatsUpsert : [chatsUpsert];
      
      for (const chatData of chatsArray) {
        if (!chatData || !chatData.id) continue;
        
        const { id } = chatData;
        if (id === 'status@broadcast') continue;

        const existingChats = getCache(id) || {};
        const chats = { 
          ...existingChats, 
          ...chatData, 
          isChats: true 
        };

        setCache(id, chats);
        conn.chats[id] = chats;

        const isGroup = id.endsWith('@g.us');
        if (isGroup && conn.insertAllGroup) {
          conn.insertAllGroup().catch(err => {
            logger.debug({ err, id }, 'Failed to insert group');
          });
        }
      }
    } catch (e) {
      logger.error({ err: e, fn: 'chats.upsert' }, 'Error in chats.upsert handler');
    }
  });

  conn.ev.on('presence.update', async function presenceUpdatePushToDb({ id, presences }) {
    if (isCleanedUp) return;
    
    try {
      if (!id || !presences) return;
      
      const sender = Object.keys(presences)[0] || id;
      const _sender = conn.decodeJid(sender);
      const presenceData = presences[sender];
      
      if (!presenceData) return;
      
      const presence = presenceData.lastKnownPresence || 'composing';

      const existingChats = getCache(_sender) || { id: _sender };
      const chats = {
        ...existingChats,
        presences: presence,
      };

      setCache(_sender, chats);
      conn.chats[_sender] = chats;

      if (id.endsWith('@g.us')) {
        const existingGroupChats = getCache(id) || { id };
        const groupChats = {
          ...existingGroupChats,
          isChats: true,
        };
        setCache(id, groupChats);
        conn.chats[id] = groupChats;
      }
    } catch (e) {
      logger.error({ err: e, fn: 'presence.update' }, 'Error in presence.update handler');
    }
  });

  conn.cleanupStore = () => {
    logger.info('Cleaning up store...');
    isCleanedUp = true;
    
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
    
    chatCache.clear();
    accessOrder.clear();
    accessCounter = 0;
    
    logger.info('Store cleanup completed');
  };

  return conn;
}