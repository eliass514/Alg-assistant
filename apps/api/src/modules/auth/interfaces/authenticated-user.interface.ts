import { RoleName } from '@common/constants/role.constants';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: RoleName | null;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  locale: string;
}
