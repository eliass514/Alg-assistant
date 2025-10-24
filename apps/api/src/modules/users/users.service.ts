import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PaginationQueryDto } from '@acme/shared-dto';
import { PrismaService } from '@prisma/prisma.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    this.logger.verbose(
      `Listing users page=${page} limit=${limit}${search ? ` search=${search}` : ''}`,
    );

    const where = search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined;

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          role: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  async findOne(id: string) {
    this.logger.verbose(`Retrieving user ${id}`);

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        appointments: {
          orderBy: { scheduledAt: 'desc' },
          take: 3,
          include: {
            service: {
              select: {
                id: true,
                slug: true,
                nameTranslations: true,
              },
            },
          },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            locale: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }
}
