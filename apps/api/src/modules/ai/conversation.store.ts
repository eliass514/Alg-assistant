import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

import { LlmConfig } from '@config/llm.config';
import {
  ConversationMessage,
  ConversationSnapshot,
  ConversationState,
} from '@modules/ai/interfaces/conversation.interface';

@Injectable()
export class ConversationStore {
  private readonly logger = new Logger(ConversationStore.name);
  private readonly store = new Map<string, Map<string, ConversationState>>();
  private readonly maxContextMessages: number;

  constructor(private readonly configService: ConfigService) {
    const llmConfig = this.getLlmConfig();
    this.maxContextMessages = llmConfig.maxContextMessages;
  }

  createOrGet(userId: string, locale: string, conversationId?: string): ConversationState {
    const conversations = this.ensureUserMap(userId);

    if (conversationId && conversations.has(conversationId)) {
      const state = conversations.get(conversationId)!;
      if (state.locale !== locale) {
        this.logger.verbose(
          `Updating conversation locale user=${userId} conversation=${conversationId} ${state.locale}=>${locale}`,
        );
        state.locale = locale;
      }
      return state;
    }

    const id = conversationId ?? randomUUID();
    const now = new Date();
    const state: ConversationState = {
      id,
      userId,
      locale,
      messages: [],
      intents: [],
      createdAt: now,
      updatedAt: now,
    };

    conversations.set(id, state);
    this.logger.debug(`Created conversation user=${userId} conversation=${id} locale=${locale}`);

    return state;
  }

  appendMessage(state: ConversationState, message: Omit<ConversationMessage, 'timestamp'>): void {
    const entry: ConversationMessage = {
      ...message,
      timestamp: new Date(),
    };

    state.messages.push(entry);

    if (state.messages.length > this.maxContextMessages) {
      state.messages.splice(0, state.messages.length - this.maxContextMessages);
    }

    state.updatedAt = entry.timestamp;
  }

  pushIntent(state: ConversationState, intent?: string): void {
    if (!intent) {
      return;
    }

    state.intents.push(intent);

    if (state.intents.length > 10) {
      state.intents.splice(0, state.intents.length - 10);
    }
  }

  snapshot(state: ConversationState): ConversationSnapshot {
    return {
      id: state.id,
      locale: state.locale,
      intents: [...state.intents],
      createdAt: state.createdAt.toISOString(),
      updatedAt: state.updatedAt.toISOString(),
      messages: state.messages.map((message) => ({
        role: message.role,
        content: message.content,
        locale: message.locale,
        intent: message.intent,
        timestamp: message.timestamp.toISOString(),
      })),
    };
  }

  private ensureUserMap(userId: string): Map<string, ConversationState> {
    let userMap = this.store.get(userId);

    if (!userMap) {
      userMap = new Map();
      this.store.set(userId, userMap);
    }

    return userMap;
  }

  private getLlmConfig(): LlmConfig {
    const config = this.configService.get<LlmConfig>('llm', { infer: true });

    if (!config) {
      throw new Error('LLM configuration is required to initialize the conversation store.');
    }

    return config;
  }
}
