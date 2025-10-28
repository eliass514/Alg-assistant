import { Logger } from '@nestjs/common';

import {
  LlmChatOptions,
  LlmChatResponse,
  LlmDocumentAssistOptions,
  LlmDocumentAssistResponse,
  LlmServiceSuggestionsOptions,
  LlmServiceSuggestionsResponse,
} from '@modules/ai/interfaces/llm.interfaces';
import { LlmProvider } from '@modules/ai/providers/llm-provider.interface';
import { MockLlmProvider } from '@modules/ai/providers/mock-llm.provider';

/**
 * AzureOpenAiLlmProvider is currently backed by the rule-based mock provider to keep
 * the application fully functional in offline and test environments. The integration
 * point is centralized here so that real Azure OpenAI calls can replace the
 * implementation with minimal impact on the rest of the codebase.
 */
export class AzureOpenAiLlmProvider implements LlmProvider {
  private readonly logger = new Logger(AzureOpenAiLlmProvider.name);
  private readonly fallback = new MockLlmProvider();

  async chat(options: LlmChatOptions): Promise<LlmChatResponse> {
    this.logger.verbose('Routing chat request through Azure OpenAI mock bridge.');
    return this.fallback.chat(options);
  }

  async serviceSuggestions(
    options: LlmServiceSuggestionsOptions,
  ): Promise<LlmServiceSuggestionsResponse> {
    this.logger.verbose('Routing service suggestion request through Azure OpenAI mock bridge.');
    return this.fallback.serviceSuggestions(options);
  }

  async documentAssist(options: LlmDocumentAssistOptions): Promise<LlmDocumentAssistResponse> {
    this.logger.verbose('Routing document assistance request through Azure OpenAI mock bridge.');
    return this.fallback.documentAssist(options);
  }
}
