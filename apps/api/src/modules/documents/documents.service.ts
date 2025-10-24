import { Injectable, Logger } from '@nestjs/common';

import { PaginationQueryDto } from '@acme/shared-dto';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  list(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    this.logger.verbose(`Listing documents page=${page} limit=${limit}`);

    return {
      data: [],
      meta: {
        page,
        limit,
        total: 0,
      },
    };
  }

  getById(id: string) {
    this.logger.verbose(`Retrieving document ${id}`);

    return {
      id,
      title: 'Document placeholder',
    };
  }
}
