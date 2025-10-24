import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AiService } from '@modules/ai/ai.service';
import { SummarizeDto } from '@modules/ai/dto/summarize.dto';

@ApiTags('ai')
@Controller({ path: 'ai', version: '1' })
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('summaries')
  @ApiOperation({ summary: 'Generate a summary using AI' })
  @ApiOkResponse({ description: 'Summary generated' })
  summarize(@Body() summarizeDto: SummarizeDto) {
    return this.aiService.summarize(summarizeDto.prompt);
  }
}
