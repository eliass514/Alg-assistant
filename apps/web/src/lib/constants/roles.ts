export const ROLE = {
  ADMIN: 'admin',
  SPECIALIST: 'specialist',
  CLIENT: 'client',
} as const;

export type RoleName = (typeof ROLE)[keyof typeof ROLE];
