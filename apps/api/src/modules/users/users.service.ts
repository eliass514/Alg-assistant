import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PaginationQueryDto } from '@acme/shared-dto';
import { AuthenticatedUser } from '@modules/auth/interfaces/authenticated-user.interface';
import { mapToAuthenticatedUser } from '@modules/auth/utils/auth.utils';
import { UpdateProfileDto } from '@modules/users/dto/update-profile.dto';
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
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          locale: true,
          createdAt: true,
          updatedAt: true,
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
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        locale: true,
        createdAt: true,
        updatedAt: true,
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

  async getProfile(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return mapToAuthenticatedUser(user);
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<AuthenticatedUser> {
    this.logger.verbose(`Updating profile for user ${userId}`);

    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...updateProfileDto,
        },
        include: {
          role: true,
        },
      });

      return mapToAuthenticatedUser(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`User ${userId} not found`);
      }

      throw error;
    }
  }
}
