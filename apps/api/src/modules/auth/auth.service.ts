import { Injectable } from '@nestjs/common';

import { LoginDto } from '@modules/auth/dto/login.dto';

@Injectable()
export class AuthService {
  login({ username }: LoginDto) {
    return {
      accessToken: 'placeholder-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: {
        username,
      },
    };
  }
}
