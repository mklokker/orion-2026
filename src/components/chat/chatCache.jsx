/**
 * Chat Cache Layer using Dexie (IndexedDB)
 * 
 * Stores conversations, messages and users locally for instant loading.
 * The app loads from cache first, then syncs with the server in background.
 */
import Dexie from "dexie";

const db = new Dexie("OrionChatCache");

db.version(1).stores({
  conversations: "id, type, last_message_at",
  messages: "id, conversation_id, created_date",
  users: "id, email",
  meta: "key",
});

// ─── Conversations ───

export async function getCachedConversations() {
  try {
    const convs = await db.conversations.orderBy("last_message_at").reverse().toArray();
    return convs.length > 0 ? convs : null;
  } catch {
    return null;
  }
}

export async function setCachedConversations(conversations) {
  try {
    await db.transaction("rw", db.conversations, async () => {
      await db.conversations.clear();
      if (conversations.length > 0) {
        await db.conversations.bulkPut(conversations);
      }
    });
  } catch (e) {
    console.error("[ChatCache] Error caching conversations:", e);
  }
}

export async function updateCachedConversation(conversation) {
  try {
    await db.conversations.put(conversation);
  } catch (e) {
    console.error("[ChatCache] Error updating cached conversation:", e);
  }
}

export async function removeCachedConversation(id) {
  try {
    await db.conversations.delete(id);
  } catch (e) {
    console.error("[ChatCache] Error removing cached conversation:", e);
  }
}

// ─── Messages ───

export async function getCachedMessages(conversationId, limit = 50) {
  try {
    const msgs = await db.messages
      .where("conversation_id")
      .equals(conversationId)
      .sortBy("created_date");
    // Return last N messages
    return msgs.length > 0 ? msgs.slice(-limit) : null;
  } catch {
    return null;
  }
}

export async function setCachedMessages(conversationId, messages) {
  try {
    await db.transaction("rw", db.messages, async () => {
      // Remove old messages for this conversation
      await db.messages.where("conversation_id").equals(conversationId).delete();
      if (messages.length > 0) {
        await db.messages.bulkPut(messages);
      }
    });
  } catch (e) {
    console.error("[ChatCache] Error caching messages:", e);
  }
}

export async function addCachedMessage(message) {
  try {
    await db.messages.put(message);
  } catch (e) {
    console.error("[ChatCache] Error adding cached message:", e);
  }
}

export async function updateCachedMessage(message) {
  try {
    await db.messages.put(message);
  } catch (e) {
    console.error("[ChatCache] Error updating cached message:", e);
  }
}

export async function removeCachedMessage(id) {
  try {
    await db.messages.delete(id);
  } catch (e) {
    console.error("[ChatCache] Error removing cached message:", e);
  }
}

// ─── Users ───

export async function getCachedUsers() {
  try {
    const users = await db.users.toArray();
    return users.length > 0 ? users : null;
  } catch {
    return null;
  }
}

export async function setCachedUsers(users) {
  try {
    await db.transaction("rw", db.users, async () => {
      await db.users.clear();
      if (users.length > 0) {
        await db.users.bulkPut(users);
      }
    });
  } catch (e) {
    console.error("[ChatCache] Error caching users:", e);
  }
}

// ─── Meta (timestamps, unread counts, etc.) ───

export async function getMeta(key) {
  try {
    const row = await db.meta.get(key);
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function setMeta(key, value) {
  try {
    await db.meta.put({ key, value });
  } catch (e) {
    console.error("[ChatCache] Error setting meta:", e);
  }
}

// ─── Clear all cache (logout, etc.) ───

export async function clearChatCache() {
  try {
    await db.transaction("rw", [db.conversations, db.messages, db.users, db.meta], async () => {
      await db.conversations.clear();
      await db.messages.clear();
      await db.users.clear();
      await db.meta.clear();
    });
  } catch (e) {
    console.error("[ChatCache] Error clearing cache:", e);
  }
}

export default db;