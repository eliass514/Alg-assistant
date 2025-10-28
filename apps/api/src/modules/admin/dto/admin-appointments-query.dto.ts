import { IsEnum, IsOptional, IsUUID, IsISO8601 } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { PaginationQueryDto } from '@acme/shared-dto';
import { AppointmentStatus } from '@prisma/client';

export class AdminAppointmentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by service ID' })
  @IsOptional()
  @IsUUID('4')
  serviceId?: string;

  @ApiPropertyOptional({
    enum: AppointmentStatus,
    description: 'Filter by appointment status',
  })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ description: 'Filter appointments scheduled from this date (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  scheduledFrom?: string;

  @ApiPropertyOptional({ description: 'Filter appointments scheduled until this date (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  scheduledTo?: string;
}
