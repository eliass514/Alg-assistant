import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { AppointmentSlotStatus, AppointmentStatus, QueueTicketStatus } from '@prisma/client';

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 25 })
  limit!: number;

  @ApiProperty({ example: 10 })
  total!: number;
}

export class AppointmentSlotAvailabilityDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  serviceId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  startAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  endAt!: string;

  @ApiProperty({ example: 'UTC' })
  timezone!: string;

  @ApiProperty({ example: 1 })
  capacity!: number;

  @ApiProperty({ example: 1 })
  available!: number;

  @ApiProperty({ enum: AppointmentSlotStatus })
  status!: AppointmentSlotStatus;

  @ApiProperty({ example: 15 })
  bufferBeforeMinutes!: number;

  @ApiProperty({ example: 15 })
  bufferAfterMinutes!: number;

  @ApiProperty({ example: 0 })
  queueLength!: number;

  @ApiPropertyOptional({ description: 'Optional notes attached to the slot' })
  notes?: string | null;
}

export class AppointmentAvailabilityResponseDto {
  @ApiProperty({ type: () => [AppointmentSlotAvailabilityDto] })
  @Type(() => AppointmentSlotAvailabilityDto)
  data!: AppointmentSlotAvailabilityDto[];
}

export class ServiceSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'residency-application-review' })
  slug!: string;

  @ApiProperty({ example: 60 })
  durationMinutes!: number;
}

export class AppointmentSlotSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  startAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  endAt!: string;

  @ApiProperty({ example: 'Europe/Paris' })
  timezone!: string;

  @ApiProperty({ example: 1 })
  capacity!: number;

  @ApiProperty({ enum: AppointmentSlotStatus })
  status!: AppointmentSlotStatus;

  @ApiProperty({ example: 15 })
  bufferBeforeMinutes!: number;

  @ApiProperty({ example: 15 })
  bufferAfterMinutes!: number;
}

export class QueueTicketResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  serviceId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  slotId?: string | null;

  @ApiProperty({ enum: QueueTicketStatus })
  status!: QueueTicketStatus;

  @ApiProperty({ example: 1 })
  position!: number;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  desiredFrom?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  desiredTo?: string | null;

  @ApiProperty({ example: 'UTC' })
  timezone!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  notifiedAt?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  expiresAt?: string | null;

  @ApiPropertyOptional({ description: 'Additional administrative notes' })
  notes?: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}

export class AppointmentDetailsDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  serviceId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  slotId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  queueTicketId?: string | null;

  @ApiProperty({ enum: AppointmentStatus })
  status!: AppointmentStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  scheduledAt!: string;

  @ApiProperty({ example: 'UTC' })
  timezone!: string;

  @ApiProperty({ example: 'en' })
  locale!: string;

  @ApiPropertyOptional({ description: 'Notes captured during the booking lifecycle' })
  notes?: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ type: () => ServiceSummaryDto })
  @Type(() => ServiceSummaryDto)
  service!: ServiceSummaryDto;

  @ApiPropertyOptional({ type: () => AppointmentSlotSummaryDto })
  @Type(() => AppointmentSlotSummaryDto)
  slot?: AppointmentSlotSummaryDto | null;

  @ApiPropertyOptional({ type: () => QueueTicketResponseDto })
  @Type(() => QueueTicketResponseDto)
  queueTicket?: QueueTicketResponseDto | null;
}

export class AppointmentListResponseDto {
  @ApiProperty({ type: () => [AppointmentDetailsDto] })
  @Type(() => AppointmentDetailsDto)
  data!: AppointmentDetailsDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  @Type(() => PaginationMetaDto)
  meta!: PaginationMetaDto;
}

export class AppointmentDetailResponseDto {
  @ApiProperty({ type: () => AppointmentDetailsDto })
  @Type(() => AppointmentDetailsDto)
  data!: AppointmentDetailsDto;
}

export class QueueTicketDetailResponseDto {
  @ApiProperty({ type: () => QueueTicketResponseDto })
  @Type(() => QueueTicketResponseDto)
  data!: QueueTicketResponseDto;
}
