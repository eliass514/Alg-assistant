import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import { AuthService } from '@modules/auth/auth.service';
import {
  AuthTokensResponseDto,
  AuthenticatedUserDto,
} from '@modules/auth/dto/auth-tokens-response.dto';
import { LoginDto } from '@modules/auth/dto/login.dto';
import { RefreshTokenDto } from '@modules/auth/dto/refresh-token.dto';
import { RegisterDto } from '@modules/auth/dto/register.dto';
import { AuthenticatedUser } from '@modules/auth/interfaces/authenticated-user.interface';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiCreatedResponse({
    description: 'User registered successfully',
    type: AuthTokensResponseDto,
  })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Authenticate a user and return JWT tokens' })
  @ApiOkResponse({
    description: 'Authentication succeeded',
    type: AuthTokensResponseDto,
  })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Refresh tokens using a valid refresh token' })
  @ApiOkResponse({
    description: 'Tokens refreshed successfully',
    type: AuthTokensResponseDto,
  })
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve the authenticated user profile' })
  @ApiOkResponse({
    description: 'Profile retrieved successfully',
    type: AuthenticatedUserDto,
  })
  profile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }
}
