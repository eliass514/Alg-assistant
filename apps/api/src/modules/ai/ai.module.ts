import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LlmConfig, LlmProviderType } from '@config/llm.config';
import { AiController } from '@modules/ai/ai.controller';
import { AiService } from '@modules/ai/ai.service';
import { ConversationStore } from '@modules/ai/conversation.store';
import { PromptGuardService } from '@modules/ai/prompt-guard.service';
import { AzureOpenAiLlmProvider } from '@modules/ai/providers/azure-openai.provider';
import { LLM_PROVIDER } from '@modules/ai/providers/llm.provider-token';
import { MockLlmProvider } from '@modules/ai/providers/mock-llm.provider';
import { ServicesModule } from '@modules/services/services.module';

@Module({
  imports: [ServicesModule],
  controllers: [AiController],
  providers: [
    AiService,
    ConversationStore,
    PromptGuardService,
    {
      provide: LLM_PROVIDER,
      useFactory: (configService: ConfigService) => {
        const config = configService.get<LlmConfig>('llm', { infer: true });

        if (!config) {
          throw new Error('LLM configuration is required to bootstrap the AI module.');
        }

        if (config.provider === LlmProviderType.AZURE_OPENAI) {
          return new AzureOpenAiLlmProvider();
        }

        return new MockLlmProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: [AiService],
})
export class AiModule {}
