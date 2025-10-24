import { Injectable, Logger } from '@nestjs/common';

import { PaginationQueryDto } from '@acme/shared-dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    this.logger.verbose(`Listing users page=${page} limit=${limit}`);

    return {
      data: [],
      meta: {
        page,
        limit,
        total: 0,
      },
    };
  }

  findOne(id: string) {
    this.logger.verbose(`Retrieving user ${id}`);

    return {
      id,
      email: 'user@example.com',
    };
  }
}
