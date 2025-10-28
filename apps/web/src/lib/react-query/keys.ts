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

export const adminServiceKeys = {
  all: ['admin', 'services'] as const,
  list: (params: {
    locale?: string;
    categoryId?: string;
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) => [...adminServiceKeys.all, 'list', params] as const,
  detail: (id: string, locale?: string) =>
    [...adminServiceKeys.all, 'detail', id, locale ?? 'default'] as const,
};

export const adminCategoryKeys = {
  all: ['admin', 'categories'] as const,
  list: (params: {
    locale?: string;
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) => [...adminCategoryKeys.all, 'list', params] as const,
  detail: (id: string, locale?: string) =>
    [...adminCategoryKeys.all, 'detail', id, locale ?? 'default'] as const,
};

export const adminDocumentTemplateKeys = {
  all: ['admin', 'document-templates'] as const,
  list: (params: {
    locale?: string;
    search?: string;
    serviceId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) => [...adminDocumentTemplateKeys.all, 'list', params] as const,
  detail: (id: string) => [...adminDocumentTemplateKeys.all, 'detail', id] as const,
};

export const adminAppointmentKeys = {
  all: ['admin', 'appointments'] as const,
  list: (params: {
    locale?: string;
    userId?: string;
    serviceId?: string;
    status?: string;
    scheduledFrom?: string;
    scheduledTo?: string;
    page?: number;
    limit?: number;
  }) => [...adminAppointmentKeys.all, 'list', params] as const,
  detail: (id: string, locale?: string) =>
    [...adminAppointmentKeys.all, 'detail', id, locale ?? 'default'] as const,
};

export const adminLogKeys = {
  all: ['admin', 'logs'] as const,
  conversations: (params: {
    userId?: string;
    appointmentId?: string;
    participant?: string;
    createdFrom?: string;
    createdTo?: string;
    locale?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => [...adminLogKeys.all, 'conversations', params] as const,
  documentVerifications: (params: {
    userId?: string;
    uploadId?: string;
    createdFrom?: string;
    createdTo?: string;
    logType?: string;
    page?: number;
    limit?: number;
  }) => [...adminLogKeys.all, 'document-verifications', params] as const,
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
