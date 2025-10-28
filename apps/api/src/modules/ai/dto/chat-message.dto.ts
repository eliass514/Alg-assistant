import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ChatMessageDto {
  @ApiPropertyOptional({ description: 'Existing conversation identifier' })
  @IsOptional()
  @IsUUID('4')
  conversationId?: string;

  @ApiProperty({ description: 'Message to send to the assistant', maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  message!: string;

  @ApiPropertyOptional({
    description: 'Preferred language for the assistant response',
    example: 'en',
  })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({ description: 'Intent hint used to guide the conversation' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  intentHint?: string;
}
