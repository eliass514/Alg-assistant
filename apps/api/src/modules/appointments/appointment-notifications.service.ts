import { Injectable, Logger } from '@nestjs/common';

export type AppointmentNotificationEventType =
  | 'appointment.booked'
  | 'appointment.rescheduled'
  | 'appointment.cancelled'
  | 'queue.ticket.created'
  | 'queue.ticket.updated'
  | 'queue.ticket.notified';

export interface AppointmentNotificationEvent<TPayload = Record<string, unknown>> {
  type: AppointmentNotificationEventType;
  payload: TPayload;
  createdAt: string;
}

@Injectable()
export class AppointmentNotificationsService {
  private readonly logger = new Logger(AppointmentNotificationsService.name);

  private readonly events: AppointmentNotificationEvent[] = [];

  getEvents(): AppointmentNotificationEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events.length = 0;
  }

  appointmentBooked(payload: {
    appointmentId: string;
    userId: string;
    serviceId: string;
    slotId: string | null;
    scheduledAt: Date;
  }): void {
    this.record('appointment.booked', {
      ...payload,
      scheduledAt: payload.scheduledAt.toISOString(),
    });
  }

  appointmentRescheduled(payload: {
    appointmentId: string;
    userId: string;
    serviceId: string;
    previousSlotId: string | null;
    newSlotId: string | null;
    scheduledAt: Date;
  }): void {
    this.record('appointment.rescheduled', {
      ...payload,
      scheduledAt: payload.scheduledAt.toISOString(),
    });
  }

  appointmentCancelled(payload: {
    appointmentId: string;
    userId: string;
    serviceId: string;
    slotId: string | null;
    reason?: string | null;
  }): void {
    this.record('appointment.cancelled', payload);
  }

  queueTicketCreated(payload: {
    ticketId: string;
    userId: string;
    serviceId: string;
    position: number;
  }): void {
    this.record('queue.ticket.created', payload);
  }

  queueTicketUpdated(payload: {
    ticketId: string;
    userId: string;
    serviceId: string;
    status: string;
  }): void {
    this.record('queue.ticket.updated', payload);
  }

  queueTicketNotified(payload: {
    ticketId: string;
    userId: string;
    serviceId: string;
    slotId: string | null;
    expiresAt: Date;
  }): void {
    this.record('queue.ticket.notified', {
      ...payload,
      expiresAt: payload.expiresAt.toISOString(),
    });
  }

  private record(type: AppointmentNotificationEventType, payload: Record<string, unknown>): void {
    const event: AppointmentNotificationEvent = {
      type,
      payload,
      createdAt: new Date().toISOString(),
    };

    this.events.push(event);
    this.logger.debug(`${type} -> ${JSON.stringify(payload)}`);
  }
}
