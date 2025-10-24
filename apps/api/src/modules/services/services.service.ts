import { Injectable, Logger } from '@nestjs/common';

import { PaginationQueryDto } from '@acme/shared-dto';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  list(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    this.logger.verbose(`Listing services page=${page} limit=${limit}`);

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
    this.logger.verbose(`Retrieving service ${id}`);

    return {
      id,
      name: 'Service placeholder',
      description: 'Describe the service here.',
    };
  }
}
