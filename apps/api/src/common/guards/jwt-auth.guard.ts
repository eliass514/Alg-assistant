import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { AuthConfig } from '@config/auth.config';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';
import { PrismaService } from '@prisma/prisma.service';
import { AuthenticatedUser } from '@modules/auth/interfaces/authenticated-user.interface';
import { JwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';
import { mapToAuthenticatedUser } from '@modules/auth/utils/auth.utils';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authorization token is missing.');
    }

    let payload: JwtPayload;
    try {
      const authConfig = this.getAuthConfig();
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: authConfig.accessTokenSecret,
        audience: authConfig.audience,
        issuer: authConfig.issuer,
      });
    } catch (error) {
      this.logger.warn(
        'Failed to verify access token',
        error instanceof Error ? error.message : undefined,
      );
      throw new UnauthorizedException('Invalid or expired access token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User associated with the token could not be found.');
    }

    request.user = mapToAuthenticatedUser(user);

    return true;
  }

  private extractTokenFromHeader(request: Request): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' && token ? token : null;
  }

  private getAuthConfig(): AuthConfig {
    const config = this.configService.get<AuthConfig>('auth', { infer: true });
    if (!config) {
      throw new UnauthorizedException('Authentication configuration is not available.');
    }

    return config;
  }
}
