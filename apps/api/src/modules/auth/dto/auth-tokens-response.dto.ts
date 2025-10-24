import { ApiProperty } from '@nestjs/swagger';

import { RoleName } from '@common/constants/role.constants';

export class AuthenticatedUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  role!: RoleName | null;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ nullable: true })
  phoneNumber!: string | null;

  @ApiProperty()
  locale!: string;
}

export class AuthTokensResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ default: 'Bearer' })
  tokenType!: string;

  @ApiProperty({ description: 'Access token expiration time in seconds' })
  expiresIn!: number;

  @ApiProperty({ type: AuthenticatedUserDto })
  user!: AuthenticatedUserDto;
}
