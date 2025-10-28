import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { QueueTicketStatus } from '@prisma/client';

export class AdminUpdateQueueTicketDto {
  @ApiPropertyOptional({ enum: QueueTicketStatus })
  @IsOptional()
  @IsEnum(QueueTicketStatus)
  status?: QueueTicketStatus;

  @ApiPropertyOptional({ description: 'Reassign the ticket to a different slot' })
  @IsOptional()
  @IsUUID('4')
  slotId?: string;

  @ApiPropertyOptional({ description: 'Update the ticket position in the queue' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  position?: number;

  @ApiPropertyOptional({ description: 'Notes for the queue ticket' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  notes?: string;
}
