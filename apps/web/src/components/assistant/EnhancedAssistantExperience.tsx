'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heading, Text } from '@/components/ui/typography';
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MessageActions } from '@/components/assistant/MessageActions';
import { TypingIndicator } from '@/components/assistant/TypingIndicator';
import { track } from '@/lib/analytics';
import {
  clearChatSession,
  loadChatSession,
  saveChatSession,
  type StoredChatMessage,
  type StoredChatSession,
} from '@/lib/storage/chatSession';
import { cn } from '@/lib/utils';

type QuickReplyTranslation = {
  id: string;
  label: string;
  prompt: string;
};

type ShortcutTranslation = {
  id: string;
  title: string;
  description: string;
  href: string;
  badge?: string;
};

type MessageSource = 'composer' | 'quick-reply';

export function EnhancedAssistantExperience() {
  const t = useTranslations('Assistant');
  const locale = useLocale();

  const [messages, setMessages] = useState<StoredChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [composerValue, setComposerValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingError, setStreamingError] = useState<string | null>(null);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const streamingIntervalRef = useRef<number | null>(null);
  const voiceTimeoutRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const responseSegments = useMemo(() => {
    const raw = t.raw('conversation.responses.segments');
    if (!Array.isArray(raw)) {
      return [] as string[];
    }

    return raw.map((segment) => String(segment));
  }, [t]);

  const responseClosing = t('conversation.responses.closing');
  const fallbackMessage = t('conversation.fallback');
  const streamingLabel = t('conversation.status.streaming');
  const roleLabels = useMemo(
    () => ({
      assistant: t('conversation.roles.assistant'),
      user: t('conversation.roles.user'),
    }),
    [t],
  );
  const quickReplies = useMemo(() => {
    const raw = t.raw('quickReplies.items') as QuickReplyTranslation[] | undefined;
    if (!Array.isArray(raw)) {
      return [] as QuickReplyTranslation[];
    }
    return raw.filter((reply) => reply && reply.id && reply.prompt);
  }, [t]);

  const shortcuts = useMemo(() => {
    const raw = t.raw('shortcuts.items') as ShortcutTranslation[] | undefined;
    if (!Array.isArray(raw)) {
      return [] as ShortcutTranslation[];
    }
    return raw.filter((item) => item && item.id && item.href);
  }, [t]);

  const messageActionLabels = useMemo(
    () => ({
      copy: t('messageActions.copy'),
      copied: t('messageActions.copied'),
      regenerate: t('messageActions.regenerate'),
      positive: t('messageActions.positive'),
      negative: t('messageActions.negative'),
    }),
    [t],
  );

  const timeFormatter = useMemo(() => {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [locale]);

  const dateFormatter = useMemo(() => {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [locale]);

  const ensureSession = useCallback(
    (existingSession?: StoredChatSession | null) => {
      if (existingSession) {
        setSessionId(existingSession.id);
        setMessages(existingSession.messages);
        track('assistant_session_restored', {
          sessionId: existingSession.id,
          locale,
          messageCount: existingSession.messages.length,
        });
        return existingSession.id;
      }

      const newSessionId = crypto.randomUUID();
      const welcomeMessage: StoredChatMessage = {
        id: `${newSessionId}-welcome`,
        author: 'assistant',
        content: t('conversation.welcome'),
        createdAt: Date.now(),
        status: 'complete',
      };
      const session: StoredChatSession = {
        id: newSessionId,
        locale,
        updatedAt: Date.now(),
        messages: [welcomeMessage],
      };
      setSessionId(newSessionId);
      setMessages(session.messages);
      saveChatSession(locale, session);
      track('assistant_session_started', {
        sessionId: newSessionId,
        locale,
      });
      return newSessionId;
    },
    [locale, t],
  );

  useEffect(() => {
    const stored = loadChatSession(locale);
    ensureSession(stored);
    // Clear any previous streaming loop when locale changes
    if (streamingIntervalRef.current) {
      window.clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }
    setIsStreaming(false);
    setStreamingError(null);
    setVoiceHint(null);
    setActionFeedback(null);

    return () => {
      if (streamingIntervalRef.current) {
        window.clearInterval(streamingIntervalRef.current);
        streamingIntervalRef.current = null;
      }
      if (voiceTimeoutRef.current) {
        window.clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = null;
      }
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = null;
      }
    };
  }, [ensureSession, locale]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    if (messages.length === 0) {
      clearChatSession(locale);
      return;
    }

    const session: StoredChatSession = {
      id: sessionId,
      locale,
      updatedAt: Date.now(),
      messages,
    };
    if (!isStreaming) {
      saveChatSession(locale, session);
    }
  }, [messages, sessionId, locale, isStreaming]);

  useEffect(() => {
    if (!messagesContainerRef.current) {
      return;
    }

    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
  }, [messages]);

  const buildResponse = useCallback(
    (prompt: string) => {
      const topic = prompt.trim() || t('conversation.defaultTopic');
      const segments = responseSegments.length > 0 ? responseSegments : [t('conversation.welcome')];
      const enriched = segments.map((segment) => segment.replace(/\{topic\}/g, topic));
      if (responseClosing) {
        enriched.push(responseClosing);
      }
      return enriched.join('\n\n');
    },
    [responseSegments, responseClosing, t],
  );

  const updateAssistantMessage = useCallback(
    (messageId: string, updater: (message: StoredChatMessage) => StoredChatMessage) => {
      setMessages((previous) =>
        previous.map((message) => (message.id === messageId ? updater(message) : message)),
      );
    },
    [],
  );

  const finishStreaming = useCallback(
    (assistantMessageId: string, fullText: string) => {
      if (streamingIntervalRef.current) {
        window.clearInterval(streamingIntervalRef.current);
        streamingIntervalRef.current = null;
      }

      updateAssistantMessage(assistantMessageId, (message) => ({
        ...message,
        content: fullText,
        status: 'complete',
      }));
      setIsStreaming(false);
      if (sessionId) {
        track('assistant_response_completed', {
          sessionId,
          locale,
          length: fullText.length,
        });
      }
    },
    [locale, sessionId, updateAssistantMessage],
  );

  const streamAssistantMessage = useCallback(
    (assistantMessageId: string, fullText: string) => {
      if (!fullText) {
        finishStreaming(assistantMessageId, '');
        return;
      }

      const totalLength = fullText.length;
      const chunk = Math.max(4, Math.round(totalLength / 60));
      let index = 0;

      streamingIntervalRef.current = window.setInterval(() => {
        index = Math.min(totalLength, index + chunk);
        const nextContent = fullText.slice(0, index);

        updateAssistantMessage(assistantMessageId, (message) => ({
          ...message,
          content: nextContent,
          status: index >= totalLength ? 'complete' : 'streaming',
        }));

        if (index >= totalLength) {
          finishStreaming(assistantMessageId, fullText);
        }
      }, 45);
    },
    [finishStreaming, updateAssistantMessage],
  );

  const createAssistantReply = useCallback(
    async (prompt: string) => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 350);
      });

      const normalized = prompt.trim().toLowerCase();
      if (
        normalized.includes('error') ||
        normalized.includes('erreur') ||
        normalized.includes('خطأ')
      ) {
        throw new Error('Simulated assistant error');
      }

      return buildResponse(prompt);
    },
    [buildResponse],
  );

  const appendMessages = useCallback((newMessages: StoredChatMessage[]) => {
    setMessages((previous) => [...previous, ...newMessages]);
  }, []);

  const handleSend = useCallback(
    async (rawInput: string, source: MessageSource) => {
      const value = rawInput.trim();
      if (!value || isStreaming) {
        return;
      }

      setStreamingError(null);
      setVoiceHint(null);
      setActionFeedback(null);

      const activeSessionId = sessionId ?? crypto.randomUUID();
      if (!sessionId) {
        setSessionId(activeSessionId);
      }

      const timestamp = Date.now();
      const userMessage: StoredChatMessage = {
        id: `${activeSessionId}-user-${timestamp}`,
        author: 'user',
        content: value,
        createdAt: timestamp,
        status: 'complete',
      };

      const assistantMessageId = `${activeSessionId}-assistant-${timestamp}`;
      const assistantMessage: StoredChatMessage = {
        id: assistantMessageId,
        author: 'assistant',
        content: '',
        createdAt: Date.now(),
        status: 'streaming',
      };

      appendMessages([userMessage, assistantMessage]);
      setComposerValue('');
      setIsStreaming(true);

      track('assistant_chat_message_sent', {
        sessionId: activeSessionId,
        locale,
        length: value.length,
        source,
      });
      track('assistant_response_requested', {
        sessionId: activeSessionId,
        locale,
      });

      try {
        const reply = await createAssistantReply(value);
        streamAssistantMessage(assistantMessageId, reply);
      } catch (error) {
        if (streamingIntervalRef.current) {
          window.clearInterval(streamingIntervalRef.current);
          streamingIntervalRef.current = null;
        }
        updateAssistantMessage(assistantMessageId, (message) => ({
          ...message,
          content: fallbackMessage,
          status: 'error',
        }));
        setIsStreaming(false);
        setStreamingError(fallbackMessage);
        track('assistant_response_error', {
          sessionId: activeSessionId,
          locale,
        });
      }
    },
    [
      appendMessages,
      createAssistantReply,
      fallbackMessage,
      isStreaming,
      locale,
      sessionId,
      streamAssistantMessage,
      updateAssistantMessage,
    ],
  );

  const handleQuickReply = useCallback(
    (reply: QuickReplyTranslation) => {
      if (isStreaming) {
        return;
      }
      track('assistant_quick_reply_selected', {
        sessionId: sessionId ?? 'pending',
        locale,
        quickReplyId: reply.id,
      });
      void handleSend(reply.prompt, 'quick-reply');
    },
    [handleSend, isStreaming, locale, sessionId],
  );

  const handleShortcutClick = useCallback(
    (shortcut: ShortcutTranslation) => {
      track('assistant_shortcut_clicked', {
        sessionId: sessionId ?? 'pending',
        locale,
        shortcutId: shortcut.id,
      });
    },
    [locale, sessionId],
  );

  const handleVoicePlaceholder = useCallback(() => {
    if (voiceTimeoutRef.current) {
      window.clearTimeout(voiceTimeoutRef.current);
      voiceTimeoutRef.current = null;
    }
    const hint = t('conversation.composer.voiceHint');
    setVoiceHint(hint);
    track('assistant_voice_placeholder_clicked', {
      sessionId: sessionId ?? 'pending',
      locale,
    });
    voiceTimeoutRef.current = window.setTimeout(() => {
      setVoiceHint(null);
      voiceTimeoutRef.current = null;
    }, 6000);
  }, [locale, sessionId, t]);

  const handleComposerSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void handleSend(composerValue, 'composer');
    },
    [composerValue, handleSend],
  );

  const showActionFeedback = useCallback((message: string) => {
    setActionFeedback(message);
    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setActionFeedback(null);
      feedbackTimeoutRef.current = null;
    }, 3000);
  }, []);

  const handleResetConversation = useCallback(() => {
    if (isStreaming) {
      return;
    }
    setShowResetDialog(true);
  }, [isStreaming]);

  const confirmResetConversation = useCallback(() => {
    clearChatSession(locale);
    const stored = loadChatSession(locale);
    ensureSession(stored);
    setShowResetDialog(false);
    showActionFeedback(t('conversation.actions.resetSuccess'));
    track('assistant_conversation_reset', {
      sessionId: sessionId ?? 'none',
      locale,
    });
  }, [ensureSession, locale, sessionId, showActionFeedback, t]);

  const handleCopyTranscript = useCallback(async () => {
    const transcript = messages
      .map((msg) => {
        const role = msg.author === 'user' ? roleLabels.user : roleLabels.assistant;
        const time = timeFormatter.format(msg.createdAt);
        return `[${role} - ${time}]\n${msg.content}`;
      })
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(transcript);
      showActionFeedback(t('conversation.actions.copySuccess'));
      track('assistant_transcript_copied', {
        sessionId: sessionId ?? 'none',
        locale,
        messageCount: messages.length,
      });
    } catch (error) {
      console.error('Failed to copy transcript:', error);
      showActionFeedback(t('conversation.actions.copyError'));
    }
  }, [messages, roleLabels, timeFormatter, showActionFeedback, t, sessionId, locale]);

  const handleExportTranscript = useCallback(() => {
    const transcript = messages
      .map((msg) => {
        const role = msg.author === 'user' ? roleLabels.user : roleLabels.assistant;
        const time = dateFormatter.format(msg.createdAt);
        return `[${role} - ${time}]\n${msg.content}`;
      })
      .join('\n\n' + '='.repeat(80) + '\n\n');

    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${sessionId || 'export'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showActionFeedback(t('conversation.actions.exportSuccess'));
    track('assistant_transcript_exported', {
      sessionId: sessionId ?? 'none',
      locale,
      messageCount: messages.length,
    });
  }, [messages, roleLabels, dateFormatter, sessionId, showActionFeedback, t, locale]);

  const handleMessageCopy = useCallback(
    (messageId: string) => {
      track('assistant_message_copied', {
        sessionId: sessionId ?? 'none',
        locale,
        messageId,
      });
    },
    [sessionId, locale],
  );

  const handleMessageRegenerate = useCallback(
    (messageId: string) => {
      if (isStreaming) {
        return;
      }

      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) {
        return;
      }

      const userMessage = [...messages]
        .slice(0, messageIndex)
        .reverse()
        .find((message) => message.author === 'user');

      if (!userMessage) {
        return;
      }

      setStreamingError(null);
      setVoiceHint(null);
      setActionFeedback(null);
      setIsStreaming(true);

      updateAssistantMessage(messageId, (message) => ({
        ...message,
        content: '',
        status: 'streaming',
        createdAt: Date.now(),
      }));

      track('assistant_message_regenerated', {
        sessionId: sessionId ?? 'none',
        locale,
        messageId,
      });

      void createAssistantReply(userMessage.content)
        .then((reply) => {
          streamAssistantMessage(messageId, reply);
        })
        .catch(() => {
          if (streamingIntervalRef.current) {
            window.clearInterval(streamingIntervalRef.current);
            streamingIntervalRef.current = null;
          }
          updateAssistantMessage(messageId, (message) => ({
            ...message,
            content: fallbackMessage,
            status: 'error',
          }));
          setIsStreaming(false);
          setStreamingError(fallbackMessage);
          track('assistant_message_regenerate_error', {
            sessionId: sessionId ?? 'none',
            locale,
            messageId,
          });
        });
    },
    [
      messages,
      isStreaming,
      updateAssistantMessage,
      createAssistantReply,
      streamAssistantMessage,
      fallbackMessage,
      sessionId,
      locale,
    ],
  );

  const handleMessageFeedback = useCallback(
    (messageId: string, positive: boolean) => {
      track('assistant_message_feedback', {
        sessionId: sessionId ?? 'none',
        locale,
        messageId,
        positive,
      });
    },
    [sessionId, locale],
  );

  const sessionMetadata = useMemo(() => {
    const userMessages = messages.filter((m) => m.author === 'user');
    const assistantMessages = messages.filter((m) => m.author === 'assistant');
    const lastUpdate = messages.length > 0 ? messages[messages.length - 1].createdAt : Date.now();

    return {
      userMessageCount: userMessages.length,
      assistantMessageCount: assistantMessages.length,
      lastUpdate,
    };
  }, [messages]);

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1">
            <Heading as="h1" size="lg" className="mb-3">
              {t('hero.title')}
            </Heading>
            <Text className="max-w-3xl text-foreground/80">{t('hero.subtitle')}</Text>
            <Text muted className="mt-2 max-w-3xl text-sm text-foreground/70">
              {t('hero.supporting')}
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {sessionMetadata.userMessageCount} {t('hero.messagesLabel')}
            </Badge>
            {isStreaming && (
              <Badge variant="warning" className="text-xs">
                {t('hero.activeLabel')}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)] xl:items-start">
        <div className="space-y-4">
          <Card className="h-full">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>{t('conversation.title')}</CardTitle>
                  <Text className="mt-1 text-sm text-foreground/70">
                    {t('conversation.persistence')}
                  </Text>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyTranscript}
                    disabled={messages.length === 0 || isStreaming}
                    title={t('conversation.actions.copy')}
                  >
                    📋
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportTranscript}
                    disabled={messages.length === 0 || isStreaming}
                    title={t('conversation.actions.export')}
                  >
                    💾
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetConversation}
                    disabled={isStreaming}
                    title={t('conversation.actions.reset')}
                  >
                    🔄
                  </Button>
                </div>
              </div>
              {actionFeedback && (
                <div className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300">
                  {actionFeedback}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex min-h-[520px] flex-col overflow-hidden rounded-3xl border border-border/80 bg-background/50 shadow-lg">
                <div
                  ref={messagesContainerRef}
                  className="flex-1 space-y-5 overflow-y-auto p-6"
                  role="log"
                  aria-live="polite"
                >
                  {messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-foreground/60">
                      {t('conversation.empty')}
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isUser = message.author === 'user';
                      const isStreaming = message.status === 'streaming';
                      const bubbleClassName = cn(
                        'max-w-[85%] rounded-3xl border px-5 py-4 text-sm leading-relaxed shadow-md transition-all hover:shadow-lg',
                        isUser
                          ? 'ml-auto border-primary/60 bg-primary text-primary-foreground'
                          : message.status === 'error'
                            ? 'border-destructive/60 bg-destructive/10 text-destructive-foreground'
                            : 'border-border/60 bg-background/90 text-foreground',
                      );

                      return (
                        <div
                          key={message.id}
                          className={cn(
                            'group flex flex-col gap-2 text-left rtl:text-right',
                            isUser ? 'items-end' : 'items-start',
                          )}
                        >
                          <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-foreground/50 rtl:space-x-reverse">
                            <span>{isUser ? roleLabels.user : roleLabels.assistant}</span>
                            <span>{timeFormatter.format(message.createdAt)}</span>
                            {message.status === 'streaming' && (
                              <Badge variant="warning" className="text-[10px] leading-tight">
                                {streamingLabel}
                              </Badge>
                            )}
                          </div>
                          <div className="flex w-full flex-col gap-2">
                            <div className={bubbleClassName} dir="auto">
                              {message.content ? (
                                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                  {message.content}
                                </p>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <TypingIndicator />
                                  <span className="text-sm italic text-foreground/70">
                                    {streamingLabel}
                                  </span>
                                </div>
                              )}
                            </div>
                            {!isUser && message.status === 'complete' && (
                              <MessageActions
                                content={message.content}
                                isAssistant
                                labels={messageActionLabels}
                                onCopy={() => handleMessageCopy(message.id)}
                                onRegenerate={() => handleMessageRegenerate(message.id)}
                                onFeedback={(positive) =>
                                  handleMessageFeedback(message.id, positive)
                                }
                                className={cn(!isStreaming && 'ltr:ml-2 rtl:mr-2')}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {streamingError ? (
                  <div className="border-t border-destructive/60 bg-destructive/10 px-6 py-3 text-sm text-destructive">
                    {streamingError}
                  </div>
                ) : null}
                <form
                  onSubmit={handleComposerSubmit}
                  className="border-t border-border/70 bg-background/80 p-4 shadow-inner"
                >
                  <label htmlFor="assistant-composer" className="sr-only">
                    {t('conversation.composer.label')}
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4 rtl:space-x-reverse">
                    <textarea
                      id="assistant-composer"
                      rows={2}
                      value={composerValue}
                      onChange={(event) => setComposerValue(event.target.value)}
                      placeholder={t('conversation.composer.placeholder')}
                      className="min-h-[60px] flex-1 resize-none rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-sm leading-relaxed text-foreground shadow-inner transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      dir="auto"
                      disabled={isStreaming}
                    />
                    <div className="flex items-center gap-2 rtl:space-x-reverse">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleVoicePlaceholder}
                        disabled={isStreaming}
                      >
                        <span aria-hidden="true">🎙️</span>
                        <span className="sr-only">{t('conversation.composer.voiceLabel')}</span>
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isStreaming || !composerValue.trim()}
                        aria-label={t('conversation.composer.ariaSend')}
                        className="min-w-[80px]"
                      >
                        {isStreaming
                          ? t('conversation.composer.sending')
                          : t('conversation.composer.send')}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
              {voiceHint ? (
                <div className="animate-fade-in rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm leading-relaxed text-blue-900 dark:text-blue-100">
                  {voiceHint}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('tips.title')}</CardTitle>
              <Text className="text-sm text-foreground/70">{t('tips.description')}</Text>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-border/70 bg-gradient-to-br from-background/80 to-background/40 p-4">
                <p className="text-sm font-medium text-foreground">💡 {t('tips.capability')}</p>
                <p className="mt-1 text-sm text-foreground/70">{t('tips.capabilityDetail')}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-gradient-to-br from-background/80 to-background/40 p-4">
                <p className="text-sm font-medium text-foreground">🎯 {t('tips.instruction')}</p>
                <p className="mt-1 text-sm text-foreground/70">{t('tips.instructionDetail')}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-gradient-to-br from-background/80 to-background/40 p-4">
                <p className="text-sm font-medium text-foreground">📊 {t('tips.session')}</p>
                <p className="mt-1 text-sm text-foreground/70">
                  {t('tips.sessionDetail', {
                    count: sessionMetadata.userMessageCount,
                    time: timeFormatter.format(sessionMetadata.lastUpdate),
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('quickReplies.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 rtl:space-x-reverse">
                {quickReplies.map((reply) => (
                  <Button
                    key={reply.id}
                    variant="secondary"
                    size="sm"
                    onClick={() => handleQuickReply(reply)}
                    disabled={isStreaming}
                    className="transition-all hover:scale-105"
                  >
                    {reply.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('shortcuts.title')}</CardTitle>
              <Text className="text-sm text-foreground/70">{t('shortcuts.description')}</Text>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-3">
                {shortcuts.map((shortcut) => (
                  <li key={shortcut.id}>
                    <Link
                      href={shortcut.href}
                      className="block rounded-2xl border border-border/70 bg-gradient-to-br from-background/60 to-background/30 p-4 transition-all hover:scale-[1.02] hover:border-primary/50 hover:bg-primary/5 hover:shadow-md"
                      onClick={() => handleShortcutClick(shortcut)}
                    >
                      <div className="flex items-start justify-between gap-3 rtl:space-x-reverse">
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-foreground">{shortcut.title}</p>
                          <p className="text-sm text-foreground/70">{shortcut.description}</p>
                        </div>
                        {shortcut.badge ? (
                          <Badge variant="outline" className="shrink-0">
                            {shortcut.badge}
                          </Badge>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showResetDialog} onClose={() => setShowResetDialog(false)}>
        <DialogHeader>
          <DialogTitle>{t('conversation.reset.title')}</DialogTitle>
          <DialogCloseButton onClick={() => setShowResetDialog(false)}>
            {t('conversation.reset.cancel')}
          </DialogCloseButton>
        </DialogHeader>
        <DialogBody>
          <Text className="text-foreground/80">{t('conversation.reset.description')}</Text>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowResetDialog(false)}>
            {t('conversation.reset.cancel')}
          </Button>
          <Button variant="destructive" onClick={confirmResetConversation}>
            {t('conversation.reset.confirm')}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
