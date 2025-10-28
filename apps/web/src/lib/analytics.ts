export type AnalyticsPayload = Record<string, unknown>;

export interface AnalyticsEvent {
  name: string;
  payload: AnalyticsPayload;
  timestamp: number;
}

const EVENT_NAME = 'analytics:track';

export function track(name: string, payload: AnalyticsPayload = {}): void {
  if (!name || typeof window === 'undefined') {
    return;
  }

  const detail: AnalyticsEvent = {
    name,
    payload,
    timestamp: Date.now(),
  };

  try {
    if (typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
    }
  } catch (error) {
    // Silently ignore dispatch errors to keep analytics non-blocking
  }

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console -- Intentional debug signal for analytics events
    console.debug(`[analytics] ${name}`, payload);
  }
}
