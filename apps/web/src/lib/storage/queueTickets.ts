import type { QueueTicket } from '@/types/appointments';

const STORAGE_KEY = 'booking:queue-tickets';

type StoredValue = QueueTicket[];

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

export function loadQueueTickets(): StoredValue {
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

export function saveQueueTickets(tickets: StoredValue): StoredValue {
  const storage = getStorage();
  if (!storage) return tickets;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  } catch {
    // ignore write errors
  }

  return tickets;
}

export function upsertQueueTicket(ticket: QueueTicket): StoredValue {
  const tickets = loadQueueTickets();
  const index = tickets.findIndex((existing) => existing.id === ticket.id);

  if (index >= 0) {
    tickets[index] = ticket;
  } else {
    tickets.push(ticket);
  }

  return saveQueueTickets(tickets);
}

export function removeQueueTicket(ticketId: string): StoredValue {
  const tickets = loadQueueTickets().filter((ticket) => ticket.id !== ticketId);
  return saveQueueTickets(tickets);
}
