import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { AppointmentStatus } from '@prisma/client';

export class AdminUpdateAppointmentDto {
  @ApiPropertyOptional({
    enum: AppointmentStatus,
    description: 'Update the status of the appointment',
  })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ description: 'Assign a different slot to reschedule the appointment' })
  @IsOptional()
  @IsUUID('4')
  slotId?: string;

  @ApiPropertyOptional({ description: 'Additional notes about the appointment' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  notes?: string;
}
