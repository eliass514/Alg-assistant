export type ChatAuthor = 'assistant' | 'user';
export type ChatMessageStatus = 'complete' | 'streaming' | 'error';

export interface StoredChatMessage {
  id: string;
  author: ChatAuthor;
  content: string;
  createdAt: number;
  status: ChatMessageStatus;
}

export interface StoredChatSession {
  id: string;
  locale: string;
  updatedAt: number;
  messages: StoredChatMessage[];
}

const STORAGE_PREFIX = 'assistant:chat-session:';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
}

function buildStorageKey(locale: string): string {
  return `${STORAGE_PREFIX}${locale || 'default'}`;
}

function isStoredChatMessage(value: unknown): value is StoredChatMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<StoredChatMessage>;
  return (
    typeof candidate.id === 'string' &&
    (candidate.author === 'assistant' || candidate.author === 'user') &&
    typeof candidate.content === 'string' &&
    typeof candidate.createdAt === 'number' &&
    (candidate.status === 'complete' ||
      candidate.status === 'streaming' ||
      candidate.status === 'error')
  );
}

function isStoredChatSession(value: unknown): value is StoredChatSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<StoredChatSession>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.locale !== 'string' ||
    typeof candidate.updatedAt !== 'number' ||
    !Array.isArray(candidate.messages)
  ) {
    return false;
  }

  return candidate.messages.every(isStoredChatMessage);
}

export function loadChatSession(locale: string): StoredChatSession | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  const key = buildStorageKey(locale);
  const raw = storage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (isStoredChatSession(parsed)) {
      return parsed;
    }
    storage.removeItem(key);
    return null;
  } catch (error) {
    storage.removeItem(key);
    return null;
  }
}

export function saveChatSession(locale: string, session: StoredChatSession): StoredChatSession {
  const storage = getStorage();
  if (!storage) {
    return session;
  }

  const key = buildStorageKey(locale);

  try {
    storage.setItem(key, JSON.stringify(session));
  } catch (error) {
    // Ignore persistence errors – the experience should stay functional without storage
  }

  return session;
}

export function clearChatSession(locale: string): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  const key = buildStorageKey(locale);
  storage.removeItem(key);
}
