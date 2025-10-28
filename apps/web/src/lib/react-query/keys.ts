export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
};

export const profileKeys = {
  all: ['profile'] as const,
  details: (locale?: string) => [...profileKeys.all, 'details', locale ?? 'default'] as const,
};

export const documentKeys = {
  all: ['documents'] as const,
  list: (locale?: string) => [...documentKeys.all, 'list', locale ?? 'default'] as const,
};

export const appointmentKeys = {
  all: ['appointments'] as const,
  list: (locale?: string) => [...appointmentKeys.all, 'list', locale ?? 'default'] as const,
};

export const serviceCategoryKeys = {
  all: ['service-categories'] as const,
  list: (locale?: string) => [...serviceCategoryKeys.all, 'list', locale ?? 'default'] as const,
};

export const serviceKeys = {
  all: ['services'] as const,
  list: (params: {
    locale: string;
    categoryId?: string | null;
    search?: string;
    isActive?: boolean;
  }) => [...serviceKeys.all, 'list', params] as const,
};
