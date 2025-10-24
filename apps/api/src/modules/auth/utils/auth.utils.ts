import { Role } from '@prisma/client';

import { RoleName } from '@common/constants/role.constants';
import { AuthenticatedUser } from '@modules/auth/interfaces/authenticated-user.interface';

export type UserWithRole = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  locale: string;
  role: Role | null;
};

export const mapToAuthenticatedUser = (user: UserWithRole): AuthenticatedUser => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: (user.role?.name as RoleName | undefined) ?? null,
  phoneNumber: user.phoneNumber ?? null,
  locale: user.locale,
});
