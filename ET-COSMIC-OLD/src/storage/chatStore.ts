import Dexie, { type Table } from 'dexie';

export interface ChatMessage {
  id: string;            // eventId Nostr or local ID
  threadId: string;      // recipientPubkey hex or "public_feed"
  senderPk: string;      // sender pubkey hex
  content: string;       // plaintext (already decrypted)
  encrypted: string;     // original ciphertext
  timestamp: number;     // Date.now()
  status: 'sent' | 'delivered' | 'read';
  direction: 'in' | 'out';
}

export interface ChatThread {
  id: string;            // recipientPubkey hex or "public_feed"
  lastMessage: string;   // preview text
  lastTimestamp: number;
  unreadCount: number;
}

class ChatDatabase extends Dexie {
  messages!: Table<ChatMessage>;
  threads!: Table<ChatThread>;

  constructor() {
    super('void-chat');
    this.version(1).stores({
      messages: 'id, threadId, timestamp, status, direction',
      threads: 'id, lastTimestamp',
    });
  }
}

const db = new ChatDatabase();

export const chatStore = {
  async addMessage(msg: ChatMessage): Promise<void> {
    await db.messages.put(msg);

    // Preserve existing unread count when updating thread from outgoing messages
    const existing = await db.threads.get(msg.threadId);
    const existingUnread = existing?.unreadCount ?? 0;
    const newUnread = msg.direction === 'in' ? existingUnread + 1 : existingUnread;

    await db.threads.put({
      id: msg.threadId,
      lastMessage: msg.content.slice(0, 100),
      lastTimestamp: msg.timestamp,
      unreadCount: newUnread,
    });
  },

  async getMessages(threadId: string, limit = 50): Promise<ChatMessage[]> {
    return db.messages
      .where('threadId')
      .equals(threadId)
      .reverse()
      .sortBy('timestamp')
      .then(msgs => msgs.slice(0, limit).reverse());
  },

  async getThreads(): Promise<ChatThread[]> {
    return db.threads.orderBy('lastTimestamp').reverse().toArray();
  },

  async markAsRead(threadId: string): Promise<void> {
    await db.threads.update(threadId, { unreadCount: 0 });
  },

  async getPendingMessages(): Promise<ChatMessage[]> {
    return db.messages.where('status').equals('sent').toArray();
  },

  async updateMessageStatus(id: string, status: ChatMessage['status']): Promise<void> {
    await db.messages.update(id, { status });
  },
};
