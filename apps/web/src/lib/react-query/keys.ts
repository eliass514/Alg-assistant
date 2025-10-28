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

export const bookingKeys = {
  all: ['booking'] as const,
  availability: (params: {
    serviceId: string;
    from?: string;
    to?: string;
    timezone?: string;
    locale?: string;
  }) => [...bookingKeys.all, 'availability', params] as const,
  appointments: (params: { locale?: string; page?: number; limit?: number } = {}) =>
    [
      ...bookingKeys.all,
      'appointments',
      params.locale ?? 'default',
      params.page ?? 1,
      params.limit ?? 'default',
    ] as const,
  queue: (locale?: string) => [...bookingKeys.all, 'queue', locale ?? 'default'] as const,
};
