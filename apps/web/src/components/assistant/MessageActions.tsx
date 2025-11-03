'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MessageActionsLabels {
  copy: string;
  copied: string;
  regenerate: string;
  positive: string;
  negative: string;
}

interface MessageActionsProps {
  content: string;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onFeedback?: (positive: boolean) => void;
  isAssistant?: boolean;
  className?: string;
  labels: MessageActionsLabels;
}

export function MessageActions({
  content,
  onCopy,
  onRegenerate,
  onFeedback,
  isAssistant = false,
  className,
  labels,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const handleCopy = async () => {
    if (!onCopy) return;

    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      onCopy();
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleFeedback = (positive: boolean) => {
    if (!onFeedback) return;
    setFeedbackGiven(positive);
    onFeedback(positive);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100',
        className,
      )}
    >
      {isAssistant && onCopy && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 text-xs"
          title={copied ? labels.copied : labels.copy}
          aria-label={copied ? labels.copied : labels.copy}
        >
          <span aria-hidden="true">{copied ? '✓' : '📋'}</span>
          <span className="sr-only">{copied ? labels.copied : labels.copy}</span>
        </Button>
      )}

      {isAssistant && onRegenerate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          className="h-7 px-2 text-xs"
          title={labels.regenerate}
          aria-label={labels.regenerate}
        >
          <span aria-hidden="true">🔄</span>
          <span className="sr-only">{labels.regenerate}</span>
        </Button>
      )}

      {isAssistant && onFeedback && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFeedback(true)}
            className={cn('h-7 px-2 text-xs', feedbackGiven === true && 'text-green-600')}
            title={labels.positive}
            aria-label={labels.positive}
            disabled={feedbackGiven !== null}
          >
            <span aria-hidden="true">👍</span>
            <span className="sr-only">{labels.positive}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFeedback(false)}
            className={cn('h-7 px-2 text-xs', feedbackGiven === false && 'text-red-600')}
            title={labels.negative}
            aria-label={labels.negative}
            disabled={feedbackGiven !== null}
          >
            <span aria-hidden="true">👎</span>
            <span className="sr-only">{labels.negative}</span>
          </Button>
        </>
      )}
    </div>
  );
}
