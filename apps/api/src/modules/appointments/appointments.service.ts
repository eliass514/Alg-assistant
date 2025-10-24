import { Injectable, Logger } from '@nestjs/common';

import { PaginationQueryDto } from '@acme/shared-dto';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  list(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    this.logger.verbose(`Listing appointments page=${page} limit=${limit}`);

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
    this.logger.verbose(`Retrieving appointment ${id}`);

    return {
      id,
      status: 'pending',
    };
  }
}
