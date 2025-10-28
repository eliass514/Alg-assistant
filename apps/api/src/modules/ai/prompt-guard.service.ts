import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LlmConfig } from '@config/llm.config';

interface PromptGuardContext {
  field: string;
}

@Injectable()
export class PromptGuardService {
  private readonly logger = new Logger(PromptGuardService.name);
  private readonly blockedPhrases: string[];
  private readonly maxPromptLength: number;

  constructor(private readonly configService: ConfigService) {
    const llmConfig = this.getLlmConfig();
    this.blockedPhrases = llmConfig.guardrails.blockedPhrases.map((phrase) => phrase.toLowerCase());
    this.maxPromptLength = llmConfig.guardrails.maxPromptLength;
  }

  enforce(prompt: string, context: PromptGuardContext): string {
    if (!prompt || !prompt.trim()) {
      throw new BadRequestException(`${context.field} cannot be empty.`);
    }

    const normalized = prompt.normalize('NFKC').trim();

    if (normalized.length > this.maxPromptLength) {
      throw new BadRequestException(
        `${context.field} exceeds the maximum allowed length of ${this.maxPromptLength} characters.`,
      );
    }

    const lower = normalized.toLowerCase();
    const hit = this.blockedPhrases.find((phrase) => lower.includes(phrase));

    if (hit) {
      this.logger.warn(`Prompt rejected due to guardrail match phrase="${hit}"`);
      throw new BadRequestException('The request was blocked by our safety filters.');
    }

    return normalized;
  }

  private getLlmConfig(): LlmConfig {
    const config = this.configService.get<LlmConfig>('llm', { infer: true });

    if (!config) {
      throw new Error('LLM configuration is required to initialize prompt guardrails.');
    }

    return config;
  }
}
