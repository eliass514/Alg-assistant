import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LlmConfig, LlmFallbackMessages } from '@config/llm.config';
import { ConversationStore } from '@modules/ai/conversation.store';
import { ChatMessageDto } from '@modules/ai/dto/chat-message.dto';
import { DocumentAssistDto } from '@modules/ai/dto/document-assist.dto';
import { ServiceSuggestionsDto } from '@modules/ai/dto/service-suggestions.dto';
import {
  ChatResponse,
  DocumentAssistResponse,
  ServiceSuggestionsResponse,
} from '@modules/ai/interfaces/ai-response.interface';
import { ServiceSuggestionItem } from '@modules/ai/interfaces/llm.interfaces';
import { LlmProvider } from '@modules/ai/providers/llm-provider.interface';
import { LLM_PROVIDER } from '@modules/ai/providers/llm.provider-token';
import { PromptGuardService } from '@modules/ai/prompt-guard.service';
import { AuthenticatedUser } from '@modules/auth/interfaces/authenticated-user.interface';
import { ServicesService } from '@modules/services/services.service';
import { ServicesQueryDto } from '@modules/services/dto/services-query.dto';

const fallbackSuggestionCatalog: Record<string, ServiceSuggestionItem[]> = {
  en: [
    {
      title: 'Schedule a discovery consultation',
      summary:
        'Book a 30-minute call with a specialist to review your needs and confirm next steps.',
      slug: 'discovery-consultation',
      confidence: 0.45,
    },
    {
      title: 'Document readiness checklist',
      summary: 'Receive a tailored checklist covering the documents you need to gather and review.',
      slug: 'document-readiness-checklist',
      confidence: 0.41,
    },
    {
      title: 'Specialist follow-up session',
      summary: 'Schedule a follow-up with your dedicated specialist to keep the process moving.',
      slug: 'specialist-follow-up-session',
      confidence: 0.37,
    },
  ],
  fr: [
    {
      title: 'Planifier une consultation découverte',
      summary:
        'Réservez 30 minutes avec un spécialiste pour analyser votre dossier et définir les prochaines étapes.',
      slug: 'consultation-decouverte',
      confidence: 0.44,
    },
    {
      title: 'Checklist de préparation des documents',
      summary: 'Recevez une checklist personnalisée des pièces à réunir et à vérifier.',
      slug: 'checklist-preparation-documents',
      confidence: 0.4,
    },
    {
      title: 'Session de suivi avec un spécialiste',
      summary: 'Organisez un suivi dédié afin de sécuriser l’avancement de vos démarches.',
      slug: 'session-suivi-specialiste',
      confidence: 0.36,
    },
  ],
  ar: [
    {
      title: 'حجز استشارة تعريفية',
      summary: 'احجز جلسة لمدة 30 دقيقة مع أخصائي لمراجعة احتياجاتك وتحديد الخطوات التالية.',
      slug: 'istishara-taerifia',
      confidence: 0.43,
    },
    {
      title: 'قائمة استعداد المستندات',
      summary: 'احصل على قائمة مخصصة بالمستندات التي يجب جمعها ومراجعتها.',
      slug: 'qaimat-istiidad-almustanadat',
      confidence: 0.39,
    },
    {
      title: 'جلسة متابعة مع الأخصائي',
      summary: 'حدد جلسة متابعة للتأكد من تقدم معاملتك بسلاسة.',
      slug: 'jalasat-mutabaea',
      confidence: 0.35,
    },
  ],
};

const fallbackFollowUps: Record<string, string[]> = {
  en: [
    'Would you like me to notify your specialist to review this offline?',
    'Should I prepare a checklist you can review before your next step?',
  ],
  fr: [
    'Souhaitez-vous qu’un spécialiste examine ce point hors ligne ?',
    'Dois-je préparer une checklist à consulter avant votre prochaine étape ?',
  ],
  ar: ['هل ترغب أن يتواصل معك الأخصائي لمراجعة ذلك؟', 'هل أعد لك قائمة مراجعة قبل الخطوة القادمة؟'],
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly llmConfig: LlmConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly conversationStore: ConversationStore,
    private readonly promptGuard: PromptGuardService,
    @Optional() private readonly servicesService?: ServicesService | null,
    @Inject(LLM_PROVIDER) private readonly llmProvider: LlmProvider,
  ) {
    this.llmConfig = this.ensureLlmConfig();
  }

  async chat(user: AuthenticatedUser, dto: ChatMessageDto): Promise<ChatResponse> {
    const locale = this.resolveLocale(dto.locale ?? user.locale);
    const sanitizedMessage = this.promptGuard.enforce(dto.message, { field: 'message' });

    const conversation = this.conversationStore.createOrGet(user.id, locale, dto.conversationId);
    this.conversationStore.appendMessage(conversation, {
      role: 'user',
      content: sanitizedMessage,
      locale,
    });

    try {
      const response = await this.llmProvider.chat({
        locale,
        messages: conversation.messages,
        intentHint: dto.intentHint,
      });

      const reply = response.reply.trim();
      const intent = response.intent ?? dto.intentHint ?? undefined;

      this.conversationStore.appendMessage(conversation, {
        role: 'assistant',
        content: reply,
        locale,
        intent,
      });
      this.conversationStore.pushIntent(conversation, intent);

      this.logger.verbose(
        `Chat response generated conversation=${conversation.id} user=${user.id} fallback=false`,
      );

      return {
        conversation: this.conversationStore.snapshot(conversation),
        reply,
        intent,
        fallback: false,
        locale,
      };
    } catch (error) {
      this.logger.error(
        `LLM chat failed for conversation=${conversation.id}, falling back to offline response`,
        error instanceof Error ? error.stack : String(error),
      );

      const fallbackMessage = this.getFallback(locale, 'generic');

      this.conversationStore.appendMessage(conversation, {
        role: 'assistant',
        content: fallbackMessage,
        locale,
        intent: 'offline_support',
      });
      this.conversationStore.pushIntent(conversation, 'offline_support');

      return {
        conversation: this.conversationStore.snapshot(conversation),
        reply: fallbackMessage,
        intent: 'offline_support',
        fallback: true,
        locale,
      };
    }
  }

  async serviceSuggestions(
    user: AuthenticatedUser,
    dto: ServiceSuggestionsDto,
  ): Promise<ServiceSuggestionsResponse> {
    const locale = this.resolveLocale(dto.locale ?? user.locale);
    const sanitizedContext = this.promptGuard.enforce(dto.context, { field: 'context' });

    try {
      const response = await this.llmProvider.serviceSuggestions({
        locale,
        context: sanitizedContext,
        intentHint: dto.intentHint,
      });

      if (!response.suggestions.length) {
        throw new Error('LLM provider returned no suggestions.');
      }

      this.logger.verbose(
        `Service suggestion response generated user=${user.id} fallback=false intent=${response.intent}`,
      );

      return {
        suggestions: response.suggestions,
        intent: response.intent ?? 'generic',
        fallback: false,
        locale,
      };
    } catch (error) {
      this.logger.warn(
        `Service suggestions fell back to offline mode user=${user.id}`,
        error instanceof Error ? error.message : String(error),
      );

      const fallback = await this.getOfflineServiceSuggestions(locale);

      return {
        suggestions: fallback.suggestions,
        intent: fallback.intent,
        fallback: true,
        locale,
        message: fallback.message,
      };
    }
  }

  async assistDocument(
    user: AuthenticatedUser,
    dto: DocumentAssistDto,
  ): Promise<DocumentAssistResponse> {
    const locale = this.resolveLocale(dto.locale ?? user.locale);
    const sanitizedPrompt = this.promptGuard.enforce(dto.prompt, { field: 'prompt' });

    try {
      const response = await this.llmProvider.documentAssist({
        locale,
        prompt: sanitizedPrompt,
        documentSummary: dto.documentSummary,
        documentType: dto.documentType,
      });

      this.logger.verbose(`Document assistance generated user=${user.id} fallback=false`);

      return {
        answer: response.answer,
        followUp: response.followUp ?? [],
        intent: response.intent,
        fallback: false,
        locale,
      };
    } catch (error) {
      this.logger.error(
        `Document assistance failed user=${user.id}, returning offline fallback`,
        error instanceof Error ? error.stack : String(error),
      );

      return {
        answer: this.getFallback(locale, 'documentAssist'),
        followUp:
          fallbackFollowUps[locale] ?? fallbackFollowUps[this.llmConfig.defaultLocale] ?? [],
        intent: 'offline_support',
        fallback: true,
        locale,
      };
    }
  }

  async summarize(prompt: string, locale?: string): Promise<{ summary: string; locale: string }> {
    const syntheticUser: AuthenticatedUser = {
      id: 'system',
      email: 'system@ai.local',
      firstName: 'System',
      lastName: 'User',
      role: null,
      phoneNumber: null,
      locale: locale ?? this.llmConfig.defaultLocale,
    };

    const response = await this.assistDocument(syntheticUser, {
      prompt,
      locale,
    });

    return {
      summary: response.answer,
      locale: response.locale,
    };
  }

  private resolveLocale(locale?: string): string {
    const normalized = locale?.toLowerCase();

    if (normalized && this.llmConfig.supportedLocales.includes(normalized)) {
      return normalized;
    }

    return this.llmConfig.defaultLocale;
  }

  private ensureLlmConfig(): LlmConfig {
    const config = this.configService.get<LlmConfig>('llm', { infer: true });

    if (!config) {
      throw new Error('LLM configuration is missing.');
    }

    return config;
  }

  private getFallback(locale: string, key: keyof LlmFallbackMessages): string {
    const localized = this.llmConfig.fallbackResponses[locale];
    if (localized) {
      return localized[key];
    }

    const defaultLocaleMessages = this.llmConfig.fallbackResponses[this.llmConfig.defaultLocale];
    return defaultLocaleMessages[key];
  }

  private async getOfflineServiceSuggestions(locale: string): Promise<{
    suggestions: ServiceSuggestionItem[];
    intent: string;
    message: string;
  }> {
    const message = this.getFallback(locale, 'serviceSuggestions');

    if (this.servicesService) {
      try {
        const result = await this.servicesService.listServices({
          page: 1,
          limit: 3,
          locale,
          isActive: true,
        } as ServicesQueryDto);

        if (result.data.length) {
          const suggestions = result.data.slice(0, 3).map<ServiceSuggestionItem>((service) => ({
            title: service.translation?.name ?? service.slug,
            summary:
              service.translation?.summary ??
              this.getFallback(this.llmConfig.defaultLocale, 'serviceSuggestions'),
            slug: service.slug,
            confidence: 0.5,
          }));

          return {
            suggestions,
            intent: 'catalog_recommendation',
            message,
          };
        }
      } catch (error) {
        this.logger.warn(
          `Unable to load services for offline suggestions locale=${locale}`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    const staticSuggestions = fallbackSuggestionCatalog[locale]
      ? [...fallbackSuggestionCatalog[locale]]
      : [...fallbackSuggestionCatalog[this.llmConfig.defaultLocale]];

    return {
      suggestions: staticSuggestions,
      intent: 'offline_support',
      message,
    };
  }
}
