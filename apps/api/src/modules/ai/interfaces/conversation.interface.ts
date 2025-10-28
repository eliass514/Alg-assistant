export type ConversationRole = 'user' | 'assistant';

export interface ConversationMessage {
  role: ConversationRole;
  content: string;
  locale: string;
  intent?: string;
  timestamp: Date;
}

export interface ConversationMessageSnapshot extends Omit<ConversationMessage, 'timestamp'> {
  timestamp: string;
}

export interface ConversationState {
  id: string;
  userId: string;
  locale: string;
  messages: ConversationMessage[];
  intents: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationSnapshot {
  id: string;
  locale: string;
  intents: string[];
  messages: ConversationMessageSnapshot[];
  createdAt: string;
  updatedAt: string;
}
