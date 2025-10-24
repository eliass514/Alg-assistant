import { RoleName } from '@common/constants/role.constants';

export interface JwtPayload {
  sub: string;
  email: string;
  role: RoleName | null;
  firstName: string;
  lastName: string;
}
