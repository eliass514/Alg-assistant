import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  summarize(prompt: string) {
    this.logger.verbose(`Summarizing prompt with length=${prompt.length}`);

    return {
      summary: 'AI summary placeholder',
    };
  }
}
