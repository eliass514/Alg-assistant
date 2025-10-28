import { registerAs } from '@nestjs/config';

export enum LlmProviderType {
  MOCK = 'mock',
  AZURE_OPENAI = 'azure-openai',
}

export interface LlmFallbackMessages {
  generic: string;
  serviceSuggestions: string;
  documentAssist: string;
}

export interface LlmGuardrailConfig {
  blockedPhrases: string[];
  maxPromptLength: number;
}

export interface LlmConfig {
  provider: LlmProviderType;
  defaultLocale: string;
  supportedLocales: string[];
  fallbackResponses: Record<string, LlmFallbackMessages>;
  guardrails: LlmGuardrailConfig;
  maxContextMessages: number;
}

const defaultBlockedPhrases = [
  'ignore previous instructions',
  'disregard previous rules',
  'disable safeguards',
  'override system prompt',
  'system override',
  'act as the system',
  'prompt injection',
].map((phrase) => phrase.toLowerCase());

const defaultFallbackMap: Record<string, LlmFallbackMessages> = {
  en: {
    generic:
      'I am unable to respond right now. Please try again soon or contact our support team for assistance.',
    serviceSuggestions:
      'Our assistant is currently offline. Based on your profile, our most requested services include scheduling consultations and reviewing documentation. A specialist will reach out shortly if needed.',
    documentAssist:
      'Document assistance is temporarily unavailable. Please review the document guidelines or contact a specialist for urgent requests.',
  },
  fr: {
    generic:
      "Je ne peux pas répondre pour le moment. Réessayez plus tard ou contactez notre équipe d'assistance pour obtenir de l'aide.",
    serviceSuggestions:
      'Notre assistant est hors ligne. En attendant, pensez à planifier une consultation ou à consulter les guides de services. Un spécialiste vous contactera si nécessaire.',
    documentAssist:
      'L’assistance documentaire est temporairement indisponible. Consultez les directives ou contactez un spécialiste pour toute demande urgente.',
  },
  ar: {
    generic:
      'لا يمكنني الرد الآن. يرجى المحاولة لاحقًا أو التواصل مع فريق الدعم للحصول على المساعدة.',
    serviceSuggestions:
      'المساعد غير متاح حاليًا. ننصحك بحجز استشارة أو مراجعة دليل الخدمات. سيتواصل معك أخصائي عند الحاجة.',
    documentAssist:
      'خدمة المساعدة في المستندات متوقفة مؤقتًا. يرجى مراجعة إرشادات المستندات أو التواصل مع أخصائي للطلبات العاجلة.',
  },
};

export default registerAs<LlmConfig>('llm', () => {
  const provider = (process.env.LLM_PROVIDER as LlmProviderType) ?? LlmProviderType.MOCK;

  const defaultLocale = (process.env.LLM_DEFAULT_LOCALE ?? process.env.APP_DEFAULT_LOCALE ?? 'en')
    .trim()
    .toLowerCase();

  const declaredSupported = process.env.LLM_SUPPORTED_LOCALES
    ? process.env.LLM_SUPPORTED_LOCALES.split(',')
        .map((locale) => locale.trim().toLowerCase())
        .filter(Boolean)
    : ['en', 'fr', 'ar'];

  const supportedSet = new Set<string>([defaultLocale, ...declaredSupported]);
  const supportedLocales = Array.from(supportedSet);

  const blockedOverrides = process.env.LLM_GUARDRAILS_BLOCKED
    ? process.env.LLM_GUARDRAILS_BLOCKED.split(',')
        .map((phrase) => phrase.trim().toLowerCase())
        .filter(Boolean)
    : undefined;

  const guardrailBlockedPhrases = blockedOverrides?.length
    ? blockedOverrides
    : defaultBlockedPhrases;

  const parsedPromptLength = Number.parseInt(process.env.LLM_MAX_PROMPT_LENGTH ?? '', 10);
  const parsedContextMessages = Number.parseInt(process.env.LLM_MAX_CONTEXT_MESSAGES ?? '', 10);

  const fallbackResponses: Record<string, LlmFallbackMessages> = {};
  for (const locale of supportedLocales) {
    fallbackResponses[locale] = defaultFallbackMap[locale] ?? defaultFallbackMap.en;
  }

  return {
    provider,
    defaultLocale,
    supportedLocales,
    fallbackResponses,
    guardrails: {
      blockedPhrases: guardrailBlockedPhrases,
      maxPromptLength: Number.isNaN(parsedPromptLength) ? 1200 : parsedPromptLength,
    },
    maxContextMessages: Number.isNaN(parsedContextMessages) ? 25 : parsedContextMessages,
  };
});
