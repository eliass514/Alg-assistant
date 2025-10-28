import { ConversationSnapshot } from '@modules/ai/interfaces/conversation.interface';
import { ServiceSuggestionItem } from '@modules/ai/interfaces/llm.interfaces';

export interface ChatResponse {
  conversation: ConversationSnapshot;
  reply: string;
  intent?: string;
  fallback: boolean;
  locale: string;
}

export interface ServiceSuggestionsResponse {
  suggestions: ServiceSuggestionItem[];
  intent: string;
  fallback: boolean;
  locale: string;
  message?: string;
}

export interface DocumentAssistResponse {
  answer: string;
  followUp: string[];
  intent?: string;
  fallback: boolean;
  locale: string;
}
