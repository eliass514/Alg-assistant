# Assistant UX Components

This directory contains the enhanced algorithmic assistant user experience components.

## Components

### EnhancedAssistantExperience

The main component that renders the complete assistant interface with enhanced features:

**Features:**

- 💬 Real-time chat interface with streaming responses
- 📋 Message actions (copy, regenerate, feedback)
- 🔄 Conversation management (reset, export, copy)
- 🎯 Quick replies for common questions
- 🔗 Shortcuts to key platform sections
- 💡 Usage tips and session metadata
- 🌐 Full i18n support (French/Arabic) with RTL
- 📱 Responsive mobile-first design
- 📊 Analytics tracking for user interactions
- 💾 Local storage persistence

**Usage:**

```tsx
import { EnhancedAssistantExperience } from '@/components/assistant/EnhancedAssistantExperience';

export default function AssistantPage() {
  return <EnhancedAssistantExperience />;
}
```

### MessageActions

Interactive actions for assistant messages:

**Features:**

- Copy message to clipboard
- Regenerate response
- Provide feedback (thumbs up/down)
- Hover-based reveal animation
- Disabled state for feedback after selection

**Props:**

```typescript
interface MessageActionsProps {
  messageId: string;
  content: string;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onFeedback?: (positive: boolean) => void;
  isAssistant?: boolean;
  className?: string;
}
```

### TypingIndicator

Animated typing indicator for streaming messages:

**Features:**

- Three bouncing dots animation
- Staggered animation delays
- Lightweight and performant

**Usage:**

```tsx
<TypingIndicator />
```

## Translation Keys

The assistant components use the following translation namespaces:

### `Assistant.hero`

- `title` - Main page title
- `subtitle` - Hero subtitle
- `supporting` - Supporting text
- `messagesLabel` - Badge label for message count
- `activeLabel` - Badge label for active streaming

### `Assistant.conversation`

- `title` - Conversation card title
- `persistence` - Persistence explanation
- `welcome` - Welcome message
- `empty` - Empty state message
- `defaultTopic` - Default topic for responses

#### `Assistant.conversation.composer`

- `label` - Accessible label
- `placeholder` - Input placeholder
- `send` - Send button text
- `sending` - Sending state text
- `ariaSend` - Accessible send button label
- `voiceLabel` - Voice input label
- `voiceHint` - Voice feature hint message

#### `Assistant.conversation.actions`

- `copy` - Copy transcript button
- `copySuccess` - Success message
- `copyError` - Error message
- `export` - Export transcript button
- `exportSuccess` - Success message
- `reset` - Reset conversation button
- `resetSuccess` - Success message

#### `Assistant.conversation.reset`

- `title` - Dialog title
- `description` - Dialog description
- `confirm` - Confirm button
- `cancel` - Cancel button

### `Assistant.quickReplies`

- `title` - Quick replies section title
- `items[]` - Array of quick reply objects with `id`, `label`, and `prompt`

### `Assistant.shortcuts`

- `title` - Shortcuts section title
- `description` - Shortcuts description
- `items[]` - Array of shortcut objects with `id`, `title`, `description`, `href`, and optional `badge`

### `Assistant.tips`

- `title` - Tips section title
- `description` - Tips description
- `capability` - Capability tip title
- `capabilityDetail` - Capability detail
- `instruction` - Instruction tip title
- `instructionDetail` - Instruction detail
- `session` - Session tip title
- `sessionDetail` - Session detail with `{count}` and `{time}` parameters

## Analytics Events

The enhanced assistant tracks the following events:

- `assistant_session_started` - New session created
- `assistant_session_restored` - Session restored from storage
- `assistant_chat_message_sent` - User message sent
- `assistant_response_requested` - Assistant response requested
- `assistant_response_completed` - Response fully streamed
- `assistant_response_error` - Response generation error
- `assistant_quick_reply_selected` - Quick reply clicked
- `assistant_shortcut_clicked` - Shortcut clicked
- `assistant_voice_placeholder_clicked` - Voice button clicked
- `assistant_conversation_reset` - Conversation reset
- `assistant_transcript_copied` - Transcript copied
- `assistant_transcript_exported` - Transcript exported
- `assistant_message_copied` - Individual message copied
- `assistant_message_regenerated` - Message regenerated
- `assistant_message_regenerate_error` - Regeneration error
- `assistant_message_feedback` - Feedback given on message

## State Management

The assistant uses React hooks and localStorage:

- **Chat Session Storage**: `/lib/storage/chatSession`
- **Session Persistence**: Per-locale storage keys
- **Message Streaming**: Interval-based character streaming
- **Cleanup**: Proper cleanup of intervals and timeouts

## Styling

The assistant uses Tailwind CSS with:

- Custom animations (`animate-fade-in`, `animate-bounce`)
- Gradient backgrounds
- Shadow utilities (`shadow-md`, `shadow-lg`)
- RTL support with `rtl:` prefix
- Dark mode support with `dark:` prefix
- Responsive breakpoints (`sm:`, `md:`, `lg:`, `xl:`)
- Hover and group-hover states

## Accessibility

- Semantic HTML (`<main>`, `<header>`, `<form>`)
- ARIA labels and roles (`role="log"`, `aria-live="polite"`)
- Keyboard navigation support
- Screen reader text with `sr-only` class
- Focus states with `focus-visible:` utilities
- Disabled states for all interactive elements
