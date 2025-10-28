import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { PaginationQueryDto } from '@acme/shared-dto';
import { QueueTicketStatus } from '@prisma/client';

export class AdminQueueTicketsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by service ID' })
  @IsOptional()
  @IsUUID('4')
  serviceId?: string;

  @ApiPropertyOptional({
    enum: QueueTicketStatus,
    description: 'Filter by queue ticket status',
  })
  @IsOptional()
  @IsEnum(QueueTicketStatus)
  status?: QueueTicketStatus;
}
