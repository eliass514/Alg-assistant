import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { QueueTicketStatus } from '@prisma/client';

export class AppointmentAvailabilityQueryDto {
  @ApiProperty({
    description: 'Identifier of the service to check availability for',
    format: 'uuid',
  })
  @IsUUID()
  serviceId!: string;

  @ApiPropertyOptional({
    description: 'Start of the search window',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'End of the search window',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'IANA timezone identifier used to interpret window values',
    example: 'Europe/Paris',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class BookAppointmentDto {
  @ApiProperty({ description: 'Service being booked', format: 'uuid' })
  @IsUUID()
  serviceId!: string;

  @ApiProperty({ description: 'Slot being booked', format: 'uuid' })
  @IsUUID()
  slotId!: string;

  @ApiPropertyOptional({ description: 'Queue ticket used to claim this slot', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  queueTicketId?: string;

  @ApiPropertyOptional({ description: 'Preferred locale for communications', example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @ApiPropertyOptional({
    description: 'Timezone context for the booking',
    example: 'America/New_York',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Additional booking notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class RescheduleAppointmentDto {
  @ApiProperty({ description: 'New slot to move the appointment to', format: 'uuid' })
  @IsUUID()
  slotId!: string;

  @ApiPropertyOptional({
    description: 'Timezone context for the new schedule',
    example: 'Asia/Dubai',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Additional context for the reschedule action' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CancelAppointmentDto {
  @ApiPropertyOptional({ description: 'Reason for cancelling the appointment' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class CreateQueueTicketDto {
  @ApiProperty({ description: 'Service the queue ticket applies to', format: 'uuid' })
  @IsUUID()
  serviceId!: string;

  @ApiPropertyOptional({
    description: 'Preferred slot to associate with the queue ticket',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  slotId?: string;

  @ApiPropertyOptional({
    description: 'Earliest desired start time',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  desiredFrom?: string;

  @ApiPropertyOptional({
    description: 'Latest desired start time',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  desiredTo?: string;

  @ApiPropertyOptional({ description: 'Timezone reference for desired window', example: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Additional information for queue administrators' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateQueueTicketStatusDto {
  @ApiProperty({ enum: QueueTicketStatus, description: 'New status for the queue ticket' })
  @IsEnum(QueueTicketStatus)
  status!: QueueTicketStatus;

  @ApiPropertyOptional({ description: 'Optional context for the status update' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
