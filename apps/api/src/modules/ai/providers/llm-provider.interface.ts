import {
  LlmChatOptions,
  LlmChatResponse,
  LlmDocumentAssistOptions,
  LlmDocumentAssistResponse,
  LlmServiceSuggestionsOptions,
  LlmServiceSuggestionsResponse,
} from '@modules/ai/interfaces/llm.interfaces';

export interface LlmProvider {
  chat(options: LlmChatOptions): Promise<LlmChatResponse>;
  serviceSuggestions(options: LlmServiceSuggestionsOptions): Promise<LlmServiceSuggestionsResponse>;
  documentAssist(options: LlmDocumentAssistOptions): Promise<LlmDocumentAssistResponse>;
}
