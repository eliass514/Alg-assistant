import { ConversationMessage } from '@modules/ai/interfaces/conversation.interface';

export interface LlmChatOptions {
  locale: string;
  messages: ConversationMessage[];
  intentHint?: string;
}

export interface LlmChatResponse {
  reply: string;
  intent?: string;
  rationale?: string;
}

export interface ServiceSuggestionItem {
  title: string;
  summary: string;
  slug?: string;
  confidence?: number;
}

export interface LlmServiceSuggestionsOptions {
  locale: string;
  context: string;
  intentHint?: string;
}

export interface LlmServiceSuggestionsResponse {
  suggestions: ServiceSuggestionItem[];
  intent: string;
  rationale?: string;
}

export interface LlmDocumentAssistOptions {
  locale: string;
  prompt: string;
  documentSummary?: string;
  documentType?: string;
}

export interface LlmDocumentAssistResponse {
  answer: string;
  followUp?: string[];
  intent?: string;
  rationale?: string;
}
