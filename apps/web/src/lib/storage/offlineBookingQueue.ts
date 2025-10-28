import type {
  BookAppointmentPayload,
  CancelAppointmentPayload,
  CreateQueueTicketPayload,
  RescheduleAppointmentPayload,
  UpdateQueueTicketStatusPayload,
} from '@/types/appointments';

export type OfflineBookingAction =
  | {
      id: string;
      type: 'book';
      locale?: string;
      data: BookAppointmentPayload;
      createdAt: number;
    }
  | {
      id: string;
      type: 'reschedule';
      locale?: string;
      appointmentId: string;
      data: RescheduleAppointmentPayload;
      createdAt: number;
    }
  | {
      id: string;
      type: 'cancel';
      locale?: string;
      appointmentId: string;
      data: CancelAppointmentPayload;
      createdAt: number;
    }
  | {
      id: string;
      type: 'joinQueue';
      locale?: string;
      data: CreateQueueTicketPayload;
      createdAt: number;
    }
  | {
      id: string;
      type: 'updateQueueStatus';
      locale?: string;
      ticketId: string;
      data: UpdateQueueTicketStatusPayload;
      createdAt: number;
    };

const STORAGE_KEY = 'booking:offline-actions';

type StoredValue = OfflineBookingAction[];

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
}

export function loadOfflineActions(): StoredValue {
  const storage = getStorage();
  if (!storage) return [];

  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as StoredValue;
    if (!Array.isArray(parsed)) {
      storage.removeItem(STORAGE_KEY);
      return [];
    }
    return parsed;
  } catch (error) {
    storage.removeItem(STORAGE_KEY);
    return [];
  }
}

export function saveOfflineActions(actions: StoredValue): StoredValue {
  const storage = getStorage();
  if (!storage) return actions;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(actions));
  } catch {
    // ignore write errors
  }

  return actions;
}

export function addOfflineAction(action: OfflineBookingAction): StoredValue {
  const actions = loadOfflineActions();
  actions.push(action);
  return saveOfflineActions(actions);
}

export function removeOfflineAction(id: string): StoredValue {
  const actions = loadOfflineActions().filter((action) => action.id !== id);
  return saveOfflineActions(actions);
}

export function clearOfflineActions(): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // ignore errors
  }
}
