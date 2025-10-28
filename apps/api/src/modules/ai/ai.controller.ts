import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AiService } from '@modules/ai/ai.service';
import { ChatMessageDto } from '@modules/ai/dto/chat-message.dto';
import { DocumentAssistDto } from '@modules/ai/dto/document-assist.dto';
import { ServiceSuggestionsDto } from '@modules/ai/dto/service-suggestions.dto';
import { SummarizeDto } from '@modules/ai/dto/summarize.dto';
import { AuthenticatedUser } from '@modules/auth/interfaces/authenticated-user.interface';

@ApiTags('ai')
@Controller({ path: 'ai', version: '1' })
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Send a chat message to the AI assistant' })
  @ApiOkResponse({ description: 'Assistant response with conversation context' })
  chat(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChatMessageDto) {
    return this.aiService.chat(user, dto);
  }

  @Post('service-suggestions')
  @ApiOperation({ summary: 'Request service suggestions powered by AI' })
  @ApiOkResponse({ description: 'Recommended services with optional fallback' })
  serviceSuggestions(@CurrentUser() user: AuthenticatedUser, @Body() dto: ServiceSuggestionsDto) {
    return this.aiService.serviceSuggestions(user, dto);
  }

  @Post('documents/assist')
  @ApiOperation({ summary: 'Receive document assistance guidance' })
  @ApiOkResponse({ description: 'Guidance and follow-up recommendations' })
  assistDocument(@CurrentUser() user: AuthenticatedUser, @Body() dto: DocumentAssistDto) {
    return this.aiService.assistDocument(user, dto);
  }

  @Post('summaries')
  @ApiOperation({ summary: 'Generate a summary using AI' })
  @ApiOkResponse({ description: 'Summary generated' })
  summarize(@Body() summarizeDto: SummarizeDto) {
    return this.aiService.summarize(summarizeDto.prompt, summarizeDto.locale);
  }
}
