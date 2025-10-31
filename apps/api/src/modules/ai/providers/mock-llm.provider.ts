import { Logger } from '@nestjs/common';

import {
  LlmChatOptions,
  LlmChatResponse,
  LlmDocumentAssistOptions,
  LlmDocumentAssistResponse,
  LlmServiceSuggestionsOptions,
  LlmServiceSuggestionsResponse,
  ServiceSuggestionItem,
} from '@modules/ai/interfaces/llm.interfaces';
import { LlmProvider } from '@modules/ai/providers/llm-provider.interface';

type IntentKey =
  | 'generic'
  | 'document_assistance'
  | 'appointment_planning'
  | 'immigration_support'
  | 'financial_advice';

type LocaleKey = 'en' | 'fr' | 'ar';

const localeOrder: LocaleKey[] = ['en', 'fr', 'ar'];

const intentLabels: Record<LocaleKey, Record<IntentKey, string>> = {
  en: {
    generic: 'support with your request',
    document_assistance: 'help preparing your documents',
    appointment_planning: 'support scheduling an appointment',
    immigration_support: 'guidance for immigration and residency matters',
    financial_advice: 'support with tax or financial questions',
  },
  fr: {
    generic: 'un accompagnement pour votre demande',
    document_assistance: 'de l’aide pour préparer vos documents',
    appointment_planning: 'un accompagnement pour planifier un rendez-vous',
    immigration_support: "des conseils sur les démarches d'immigration et de résidence",
    financial_advice: 'un accompagnement pour vos questions fiscales ou financières',
  },
  ar: {
    generic: 'دعم لطلبك',
    document_assistance: 'مساعدة في إعداد المستندات',
    appointment_planning: 'دعم في حجز المواعيد',
    immigration_support: 'إرشاد حول الهجرة والإقامة',
    financial_advice: 'دعم في الأسئلة الضريبية أو المالية',
  },
};

const chatTemplates: Record<
  LocaleKey,
  { opening: string; defaultPrompt: string; snippetPrefix: string; closing: string }
> = {
  en: {
    opening: 'Thank you for the context. I understand you need {intent}.',
    defaultPrompt:
      'Please share any additional details and I will guide you through the next steps.',
    snippetPrefix: 'You mentioned "{snippet}".',
    closing: 'Here is how we can move forward together.',
  },
  fr: {
    opening: 'Merci pour ces informations. Je comprends que vous avez besoin de {intent}.',
    defaultPrompt:
      'N’hésitez pas à partager plus de détails, je vous accompagne pour définir les prochaines étapes.',
    snippetPrefix: 'Vous avez précisé «\u00a0{snippet}\u00a0».',
    closing: 'Voici comment nous pouvons avancer ensemble.',
  },
  ar: {
    opening: 'شكرًا لك على المعلومات. أفهم أنك تحتاج إلى {intent}.',
    defaultPrompt: 'يرجى مشاركة أي تفاصيل إضافية وسأرشدك إلى الخطوات التالية.',
    snippetPrefix: 'ذكرت "{snippet}".',
    closing: 'إليك كيفية المتابعة معًا.',
  },
};

const suggestionCatalog: Record<LocaleKey, Record<IntentKey, ServiceSuggestionItem[]>> = {
  en: {
    generic: [
      {
        title: 'Discovery consultation',
        summary:
          'Schedule a 30-minute call to review your situation and outline tailored next steps.',
        slug: 'discovery-consultation',
        confidence: 0.72,
      },
      {
        title: 'Document preparation review',
        summary: 'Have a specialist validate that your paperwork is complete before submission.',
        slug: 'document-preparation-review',
        confidence: 0.64,
      },
      {
        title: 'Follow-up support session',
        summary: 'Book a follow-up to answer outstanding questions and confirm requirements.',
        slug: 'follow-up-support-session',
        confidence: 0.58,
      },
    ],
    document_assistance: [
      {
        title: 'Document review consultation',
        summary:
          'Work with a specialist to review forms, evidence, and translations ahead of submission.',
        slug: 'document-review-consultation',
        confidence: 0.86,
      },
      {
        title: 'Certified translation support',
        summary: 'Coordinate certified translations and legalization for official paperwork.',
        slug: 'certified-translation-support',
        confidence: 0.82,
      },
      {
        title: 'Submission checklist session',
        summary: 'Receive a tailored checklist covering the documents you need to prepare.',
        slug: 'submission-checklist-session',
        confidence: 0.78,
      },
    ],
    appointment_planning: [
      {
        title: 'Priority appointment booking',
        summary: 'Let our coordination team secure the earliest available slot for your case.',
        slug: 'priority-appointment-booking',
        confidence: 0.8,
      },
      {
        title: 'Preparation call with specialist',
        summary: 'Review the agenda and documents required before you meet with the agency.',
        slug: 'appointment-preparation-call',
        confidence: 0.69,
      },
      {
        title: 'Reminder & follow-up package',
        summary: 'Receive reminders, checklists, and post-appointment follow-up support.',
        slug: 'appointment-reminder-package',
        confidence: 0.62,
      },
    ],
    immigration_support: [
      {
        title: 'Immigration strategy session',
        summary: 'Build a personalized immigration plan with a licensed specialist.',
        slug: 'immigration-strategy-session',
        confidence: 0.88,
      },
      {
        title: 'Residency eligibility review',
        summary:
          'Verify eligibility requirements and documentation for your target residency program.',
        slug: 'residency-eligibility-review',
        confidence: 0.82,
      },
      {
        title: 'Application readiness checklist',
        summary: 'Confirm that your dossier meets official standards before you submit it.',
        slug: 'application-readiness-checklist',
        confidence: 0.74,
      },
    ],
    financial_advice: [
      {
        title: 'Tax consultation',
        summary: 'Meet with a tax specialist to clarify declarations and optimize your strategy.',
        slug: 'tax-consultation',
        confidence: 0.83,
      },
      {
        title: 'Financial compliance review',
        summary: 'Ensure your financial documentation meets regulatory requirements.',
        slug: 'financial-compliance-review',
        confidence: 0.78,
      },
      {
        title: 'Budget planning workshop',
        summary: 'Create a tailored budget covering fees, timelines, and documentation costs.',
        slug: 'budget-planning-workshop',
        confidence: 0.66,
      },
    ],
  },
  fr: {
    generic: [
      {
        title: 'Consultation découverte',
        summary:
          'Planifiez un entretien de 30 minutes pour analyser votre situation et définir les prochaines étapes.',
        slug: 'consultation-decouverte',
        confidence: 0.7,
      },
      {
        title: 'Revue de préparation des documents',
        summary: 'Faites valider vos documents par un spécialiste avant leur dépôt.',
        slug: 'revue-preparation-documents',
        confidence: 0.63,
      },
      {
        title: 'Session de suivi',
        summary: 'Prenez un rendez-vous de suivi pour répondre aux questions restantes.',
        slug: 'session-suivi',
        confidence: 0.57,
      },
    ],
    document_assistance: [
      {
        title: 'Consultation de vérification des documents',
        summary: 'Analyse détaillée des formulaires et pièces justificatives avec un spécialiste.',
        slug: 'consultation-verification-documents',
        confidence: 0.85,
      },
      {
        title: 'Aide à la traduction certifiée',
        summary: 'Organisation des traductions certifiées et de la légalisation des documents.',
        slug: 'aide-traduction-certifiee',
        confidence: 0.8,
      },
      {
        title: 'Checklist personnalisée',
        summary: 'Recevez une checklist adaptée aux documents à réunir.',
        slug: 'checklist-personnalisee',
        confidence: 0.76,
      },
    ],
    appointment_planning: [
      {
        title: 'Prise de rendez-vous prioritaire',
        summary: "Notre équipe s'occupe de trouver le créneau le plus rapide pour votre dossier.",
        slug: 'prise-rendez-vous-prioritaire',
        confidence: 0.78,
      },
      {
        title: 'Préparation au rendez-vous',
        summary: "Révision de l'ordre du jour et des pièces à présenter avant votre rendez-vous.",
        slug: 'preparation-rendez-vous',
        confidence: 0.68,
      },
      {
        title: 'Pack rappels & suivi',
        summary: 'Recevez des rappels, des checklists et un suivi après votre rendez-vous.',
        slug: 'pack-rappels-suivi',
        confidence: 0.6,
      },
    ],
    immigration_support: [
      {
        title: 'Session stratégie immigration',
        summary: 'Construisez un plan personnalisé avec un expert agréé.',
        slug: 'session-strategie-immigration',
        confidence: 0.87,
      },
      {
        title: 'Vérification d’éligibilité',
        summary: 'Analyse des critères et pièces requis pour votre programme de résidence.',
        slug: 'verification-eligibilite',
        confidence: 0.81,
      },
      {
        title: 'Préparation du dossier',
        summary: 'Assurez-vous que votre dossier est complet avant dépôt.',
        slug: 'preparation-dossier',
        confidence: 0.73,
      },
    ],
    financial_advice: [
      {
        title: 'Consultation fiscale',
        summary: 'Entretien avec un spécialiste pour clarifier vos obligations.',
        slug: 'consultation-fiscale',
        confidence: 0.82,
      },
      {
        title: 'Audit de conformité financière',
        summary: 'Vérifiez que vos documents financiers respectent la réglementation.',
        slug: 'audit-conformite-financiere',
        confidence: 0.76,
      },
      {
        title: 'Atelier budget',
        summary: 'Élaborez un budget sur-mesure pour vos démarches.',
        slug: 'atelier-budget',
        confidence: 0.65,
      },
    ],
  },
  ar: {
    generic: [
      {
        title: 'استشارة تمهيدية',
        summary: 'احجز جلسة لمدة 30 دقيقة لمراجعة وضعك وتحديد الخطوات التالية.',
        slug: 'istishara-tamhidiya',
        confidence: 0.69,
      },
      {
        title: 'مراجعة إعداد المستندات',
        summary: 'دع الأخصائي يتحقق من اكتمال مستنداتك قبل تقديمها.',
        slug: 'murajaea-almustanadat',
        confidence: 0.6,
      },
      {
        title: 'جلسة متابعة',
        summary: 'حدد جلسة متابعة للإجابة عن الأسئلة المتبقية.',
        slug: 'jalasat-mutabaea',
        confidence: 0.55,
      },
    ],
    document_assistance: [
      {
        title: 'استشارة مراجعة المستندات',
        summary: 'مراجعة متخصصة للنماذج والمرفقات قبل التقديم.',
        slug: 'istishara-murajaeat-almustanadat',
        confidence: 0.84,
      },
      {
        title: 'دعم الترجمة المعتمدة',
        summary: 'تنسيق الترجمات المعتمدة وتصديق المستندات الرسمية.',
        slug: 'daem-altarjama-almuetamida',
        confidence: 0.79,
      },
      {
        title: 'قائمة تحقق مخصصة',
        summary: 'احصل على قائمة مخصصة بالمستندات المطلوبة.',
        slug: 'qaimat-tahaqquq-mukhasasa',
        confidence: 0.75,
      },
    ],
    appointment_planning: [
      {
        title: 'حجز موعد أولوية',
        summary: 'نساعدك في الحصول على أقرب موعد مناسب لملفك.',
        slug: 'hajz-mawead-awlawiya',
        confidence: 0.77,
      },
      {
        title: 'جلسة تحضير للموعد',
        summary: 'مراجعة ما يجب تحضيره قبل حضورك.',
        slug: 'jalasat-tahdir',
        confidence: 0.67,
      },
      {
        title: 'رزم التذكير والمتابعة',
        summary: 'احصل على تذكيرات وقوائم متابعة بعد الموعد.',
        slug: 'ruzam-tadhkir-mutataba',
        confidence: 0.59,
      },
    ],
    immigration_support: [
      {
        title: 'جلسة استراتيجية للهجرة',
        summary: 'ضع خطة مخصصة مع خبير معتمد للهجرة أو الإقامة.',
        slug: 'jalasat-istratijiya',
        confidence: 0.86,
      },
      {
        title: 'مراجعة الأهلية للإقامة',
        summary: 'تحقق من استيفاء شروط برنامج الإقامة المستهدف.',
        slug: 'murajaeat-ahlia',
        confidence: 0.8,
      },
      {
        title: 'قائمة جاهزية الملف',
        summary: 'تأكد من جاهزية ملفك قبل تقديمه.',
        slug: 'qaimat-jahiziat',
        confidence: 0.72,
      },
    ],
    financial_advice: [
      {
        title: 'استشارة ضريبية',
        summary: 'جلسة مع متخصص لتوضيح التزاماتك الضريبية.',
        slug: 'istishara-daribiya',
        confidence: 0.81,
      },
      {
        title: 'مراجعة الامتثال المالي',
        summary: 'تأكد من مطابقة مستنداتك للمتطلبات التنظيمية.',
        slug: 'murajaeat-alaimtithal-almali',
        confidence: 0.75,
      },
      {
        title: 'ورشة تخطيط الميزانية',
        summary: 'ضع ميزانية مخصصة لتكاليف متطلباتك.',
        slug: 'warshat-takhtit-almizania',
        confidence: 0.64,
      },
    ],
  },
};

const documentAssistContent: Record<
  LocaleKey,
  {
    buildAnswer: (prompt: string, documentType?: string, summary?: string) => string;
    followUps: Record<IntentKey, string[]>;
  }
> = {
  en: {
    buildAnswer: (prompt, documentType, summary) => {
      const snippet = truncate(prompt, 220);
      const summaryClause = summary
        ? `I noted the summary you provided: "${truncate(summary, 160)}". `
        : '';
      const documentClause = documentType ? `For the ${documentType}, ` : 'For your request, ';

      return (
        `${summaryClause}${documentClause}here is a structured plan based on your notes:\n` +
        `1. Confirm the official guidance matches the information in "${snippet}".\n` +
        '2. Gather supporting evidence and translations before completing the final form.\n' +
        '3. Schedule a review with a specialist if anything remains unclear.'
      );
    },
    followUps: {
      generic: [
        'Would you like me to connect you with a specialist for a quick review?',
        'Should I assemble a checklist of required attachments?',
      ],
      document_assistance: [
        'Do you need help translating or legalising any of the documents?',
        'Would a templated cover letter be useful for this submission?',
      ],
      appointment_planning: [
        'Should I help you confirm the booking requirements?',
        'Do you need reminders before the appointment date?',
      ],
      immigration_support: [
        'Would you like guidance on eligibility evidence for this application?',
        'Shall I create a timeline for your immigration milestones?',
      ],
      financial_advice: [
        'Do you want to review the tax forms involved?',
        'Should I outline the typical supporting invoices or statements?',
      ],
    },
  },
  fr: {
    buildAnswer: (prompt, documentType, summary) => {
      const snippet = truncate(prompt, 220);
      const summaryClause = summary
        ? `Résumé indiqué : «\u00a0${truncate(summary, 160)}\u00a0». `
        : '';
      const documentClause = documentType ? `Concernant ${documentType}, ` : 'Pour votre demande, ';

      return (
        `${summaryClause}${documentClause}voici une approche recommandée basée sur vos éléments :\n` +
        `1. Vérifiez que les consignes officielles correspondent aux informations «\u00a0${snippet}\u00a0».\n` +
        '2. Rassemblez les justificatifs et traductions avant de compléter le formulaire final.\n' +
        '3. Prévoyez une relecture avec un spécialiste si nécessaire.'
      );
    },
    followUps: {
      generic: [
        'Souhaitez-vous qu’un spécialiste relise vos documents ?',
        'Dois-je préparer une checklist des pièces à joindre ?',
      ],
      document_assistance: [
        'Avez-vous besoin d’aide pour des traductions certifiées ?',
        'Voulez-vous un modèle de lettre d’accompagnement ?',
      ],
      appointment_planning: [
        'Dois-je vérifier les pièces exigées pour le rendez-vous ?',
        'Souhaitez-vous des rappels avant la date fixée ?',
      ],
      immigration_support: [
        'Souhaitez-vous un point sur les justificatifs d’éligibilité ?',
        'Dois-je proposer un calendrier pour vos démarches ?',
      ],
      financial_advice: [
        'Voulez-vous passer en revue les formulaires fiscaux concernés ?',
        'Dois-je lister les pièces comptables à préparer ?',
      ],
    },
  },
  ar: {
    buildAnswer: (prompt, documentType, summary) => {
      const snippet = truncate(prompt, 220);
      const summaryClause = summary ? `ملخص مذكور: "${truncate(summary, 160)}". ` : '';
      const documentClause = documentType ? `بالنسبة لـ ${documentType}، ` : 'بالنسبة لطلبك، ';

      return (
        `${summaryClause}${documentClause}إليك خطة مقترحة بناءً على المعلومات التالية:\n` +
        `1. تأكد من أن التعليمات الرسمية تطابق ما ورد في "${snippet}".\n` +
        '2. جهز المستندات المؤيدة والترجمات قبل إكمال النموذج النهائي.\n' +
        '3. حدد جلسة مراجعة مع أخصائي إذا ظل أي شيء غير واضح.'
      );
    },
    followUps: {
      generic: [
        'هل ترغب في أن أوصلك بأخصائي لمراجعة سريعة؟',
        'هل أعد لك قائمة بالمرفقات المطلوبة؟',
      ],
      document_assistance: [
        'هل تحتاج إلى مساعدة في الترجمة أو التصديق؟',
        'هل يناسبك الحصول على نموذج رسالة مرافقة؟',
      ],
      appointment_planning: [
        'هل أساعدك في التأكد من متطلبات الحجز؟',
        'هل تحتاج إلى تذكيرات قبل موعدك؟',
      ],
      immigration_support: [
        'هل ترغب في إرشادات حول إثبات الأهلية لهذا الطلب؟',
        'هل أعد لك جدولًا زمنيًا للخطوات الأساسية؟',
      ],
      financial_advice: [
        'هل تريد مراجعة النماذج الضريبية المرتبطة؟',
        'هل أذكر لك المستندات المالية الداعمة عادةً؟',
      ],
    },
  },
};

function truncate(text: string, length: number): string {
  if (text.length <= length) {
    return text;
  }
  return `${text.slice(0, Math.max(0, length - 1)).trim()}…`;
}

export class MockLlmProvider implements LlmProvider {
  private readonly logger = new Logger(MockLlmProvider.name);

  async chat(options: LlmChatOptions): Promise<LlmChatResponse> {
    const locale = this.resolveLocale(options.locale);
    const lastUserMessage = this.getLastUserMessage(options.messages) ?? '';
    const detectedIntent = (options.intentHint ?? this.detectIntent(lastUserMessage)) as IntentKey;

    this.logger.debug(`Generating mock chat response locale=${locale} intent=${detectedIntent}`);

    const message = this.buildChatReply(locale, detectedIntent, lastUserMessage);

    return {
      reply: message,
      intent: detectedIntent === 'generic' ? undefined : detectedIntent,
    };
  }

  async serviceSuggestions(
    options: LlmServiceSuggestionsOptions,
  ): Promise<LlmServiceSuggestionsResponse> {
    const locale = this.resolveLocale(options.locale);
    const intent = (options.intentHint ?? this.detectIntent(options.context)) as IntentKey;

    this.logger.debug(
      `Generating mock service suggestions locale=${locale} intent=${intent} contextLength=${options.context.length}`,
    );

    const suggestions = this.buildSuggestions(locale, intent);

    return {
      suggestions,
      intent,
      rationale:
        intent === 'generic'
          ? undefined
          : `Suggestions tailored for ${intentLabels[locale][intent as IntentKey] ?? intent}.`,
    };
  }

  async documentAssist(options: LlmDocumentAssistOptions): Promise<LlmDocumentAssistResponse> {
    const locale = this.resolveLocale(options.locale);
    const intent = this.detectIntent(options.prompt);

    this.logger.debug(
      `Generating mock document assistance locale=${locale} intent=${intent} promptLength=${options.prompt.length}`,
    );

    const content = this.buildDocumentAnswer(locale, intent, options);

    return {
      answer: content.answer,
      followUp: content.followUps,
      intent: intent === 'generic' ? undefined : intent,
    };
  }

  private resolveLocale(locale?: string): LocaleKey {
    const normalized = locale?.toLowerCase();
    if (normalized && localeOrder.includes(normalized as LocaleKey)) {
      return normalized as LocaleKey;
    }
    return 'en';
  }

  private getLastUserMessage(messages: LlmChatOptions['messages']): string | undefined {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.role === 'user') {
        return message.content;
      }
    }
    return undefined;
  }

  private detectIntent(text: string): IntentKey {
    const normalized = text.toLowerCase();

    if (/document|paper|form|attachment|translation/.test(normalized)) {
      return 'document_assistance';
    }
    if (/appointment|schedule|booking|slot/.test(normalized)) {
      return 'appointment_planning';
    }
    if (/visa|immigration|residency|permit/.test(normalized)) {
      return 'immigration_support';
    }
    if (/tax|finance|budget|invoice|statement/.test(normalized)) {
      return 'financial_advice';
    }

    return 'generic';
  }

  private buildChatReply(locale: LocaleKey, intent: IntentKey, message: string): string {
    const template = chatTemplates[locale];
    const label = intentLabels[locale][intent] ?? intentLabels[locale].generic;

    const snippet = message
      ? template.snippetPrefix.replace('{snippet}', truncate(message, 160))
      : template.defaultPrompt;

    return `${template.opening.replace('{intent}', label)} ${snippet} ${template.closing}`;
  }

  private buildSuggestions(locale: LocaleKey, intent: IntentKey): ServiceSuggestionItem[] {
    const catalog = suggestionCatalog[locale];
    const matches = catalog[intent] ?? catalog.generic;

    return matches.map((item) => ({ ...item }));
  }

  private buildDocumentAnswer(
    locale: LocaleKey,
    intent: IntentKey,
    options: LlmDocumentAssistOptions,
  ): { answer: string; followUps: string[] } {
    const content = documentAssistContent[locale];
    const answer = content.buildAnswer(
      options.prompt,
      options.documentType,
      options.documentSummary,
    );
    const followUps = content.followUps[intent] ?? content.followUps.generic;

    return {
      answer,
      followUps,
    };
  }
}
