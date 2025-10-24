import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AuthConfig } from '@config/auth.config';
import { PrismaService } from '@prisma/prisma.service';
import { LoginDto } from '@modules/auth/dto/login.dto';
import { RefreshTokenDto } from '@modules/auth/dto/refresh-token.dto';
import { RegisterDto } from '@modules/auth/dto/register.dto';
import { AuthenticatedUser } from '@modules/auth/interfaces/authenticated-user.interface';
import { JwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';
import { mapToAuthenticatedUser, UserWithRole } from '@modules/auth/utils/auth.utils';

const TOKEN_TYPE = 'Bearer';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthenticatedUser;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthTokens> {
    const authConfig = this.getAuthConfig();
    const email = registerDto.email.toLowerCase();

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('An account already exists with this email address.');
    }

    const role = await this.prisma.role.findUnique({ where: { name: authConfig.defaultUserRole } });
    if (!role) {
      throw new BadRequestException('Default user role is not configured.');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, authConfig.bcryptSaltRounds);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        phoneNumber: registerDto.phoneNumber ?? null,
        locale: registerDto.locale ?? 'en',
        roleId: role.id,
      },
      include: {
        role: true,
      },
    });

    this.logger.log(`Registered new user ${user.id} (${user.email})`);

    return this.buildAuthResponse(user);
  }

  async login(loginDto: LoginDto): Promise<AuthTokens> {
    const email = loginDto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    this.logger.debug(`User ${user.id} authenticated successfully`);

    return this.buildAuthResponse(user);
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto): Promise<AuthTokens> {
    const authConfig = this.getAuthConfig();

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshTokenDto.refreshToken, {
        secret: authConfig.refreshTokenSecret,
        audience: authConfig.audience,
        issuer: authConfig.issuer,
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const activeToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        isRevoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!activeToken) {
      throw new UnauthorizedException('Refresh token is no longer valid.');
    }

    const isMatchingToken = await bcrypt.compare(
      refreshTokenDto.refreshToken,
      activeToken.tokenHash,
    );
    if (!isMatchingToken) {
      throw new UnauthorizedException('Refresh token mismatch.');
    }

    await this.prisma.refreshToken.update({
      where: { id: activeToken.id },
      data: { isRevoked: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User associated with the token could not be found.');
    }

    return this.buildAuthResponse(user);
  }

  async getProfile(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return mapToAuthenticatedUser(user);
  }

  private buildJwtPayload(user: UserWithRole): JwtPayload {
    const authenticatedUser = mapToAuthenticatedUser(user);

    return {
      sub: authenticatedUser.id,
      email: authenticatedUser.email,
      role: authenticatedUser.role,
      firstName: authenticatedUser.firstName,
      lastName: authenticatedUser.lastName,
    };
  }

  private async buildAuthResponse(user: UserWithRole): Promise<AuthTokens> {
    const payload = this.buildJwtPayload(user);
    const tokens = await this.issueTokens(user.id, payload);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: TOKEN_TYPE,
      expiresIn: tokens.expiresIn,
      user: mapToAuthenticatedUser(user),
    };
  }

  private async issueTokens(userId: string, payload: JwtPayload) {
    const authConfig = this.getAuthConfig();

    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    });

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: authConfig.accessTokenSecret,
        expiresIn: authConfig.accessTokenExpiresIn,
        audience: authConfig.audience,
        issuer: authConfig.issuer,
      }),
      this.jwtService.signAsync(payload, {
        secret: authConfig.refreshTokenSecret,
        expiresIn: authConfig.refreshTokenExpiresIn,
        audience: authConfig.audience,
        issuer: authConfig.issuer,
      }),
    ]);

    const refreshTokenHash = await bcrypt.hash(refreshToken, authConfig.bcryptSaltRounds);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + authConfig.refreshTokenExpiresIn * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: authConfig.accessTokenExpiresIn,
    };
  }

  private getAuthConfig(): AuthConfig {
    const config = this.configService.get<AuthConfig>('auth', { infer: true });
    if (!config) {
      throw new InternalServerErrorException('Authentication configuration is not available.');
    }

    return config;
  }
}
