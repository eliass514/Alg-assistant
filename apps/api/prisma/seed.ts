import { AppointmentStatus, ConversationParticipant, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data to keep the seed idempotent
  await prisma.refreshToken.deleteMany();
  await prisma.conversationLog.deleteMany();
  await prisma.document.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.documentTemplate.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();

  const permissionsData = [
    {
      key: 'manage_users',
      description: 'Create, update, and delete user accounts',
    },
    {
      key: 'view_users',
      description: 'View user directory and profiles',
    },
    {
      key: 'manage_appointments',
      description: 'Create and update appointment schedules',
    },
    {
      key: 'view_appointments',
      description: 'View appointment schedules and details',
    },
    {
      key: 'manage_documents',
      description: 'Create and update document templates and records',
    },
    {
      key: 'view_documents',
      description: 'View generated documents and templates',
    },
    {
      key: 'manage_services',
      description: 'Create and update services catalog entries',
    },
    {
      key: 'view_services',
      description: 'View services catalog entries',
    },
  ];

  const permissions = await Promise.all(
    permissionsData.map((permission) =>
      prisma.permission.create({
        data: permission,
      }),
    ),
  );

  const permissionsByKey = new Map(permissions.map((permission) => [permission.key, permission]));

  const getPermissionOrThrow = (key: string) => {
    const permission = permissionsByKey.get(key);
    if (!permission) {
      throw new Error(`Missing permission for key ${key}`);
    }
    return permission;
  };

  const adminRole = await prisma.role.create({
    data: {
      name: 'admin',
      description: 'System administrators with full access',
      rolePermissions: {
        create: permissions.map((permission) => ({
          permission: {
            connect: {
              id: permission.id,
            },
          },
        })),
      },
    },
  });

  const specialistRole = await prisma.role.create({
    data: {
      name: 'specialist',
      description: 'Subject matter experts delivering services',
      rolePermissions: {
        create: [
          'view_users',
          'view_appointments',
          'manage_documents',
          'view_documents',
          'view_services',
        ].map((key) => ({
          permission: {
            connect: {
              id: getPermissionOrThrow(key).id,
            },
          },
        })),
      },
    },
  });

  const clientRole = await prisma.role.create({
    data: {
      name: 'client',
      description: 'End-users booking appointments and receiving documents',
      rolePermissions: {
        create: ['view_appointments', 'view_documents', 'view_services'].map((key) => ({
          permission: {
            connect: {
              id: getPermissionOrThrow(key).id,
            },
          },
        })),
      },
    },
  });

  await prisma.user.create({
    data: {
      email: 'amina.admin@example.com',
      passwordHash: '$2b$10$uC0Bpvy.buk..qS0bkkCmOs.zAV/QXpVZl8vGeOawx2UY8ailqBeK',
      firstName: 'Amina',
      lastName: 'Admin',
      phoneNumber: '+15550000001',
      locale: 'en',
      roleId: adminRole.id,
    },
  });

  const [specialistUser, clientUser] = await Promise.all([
    prisma.user.create({
      data: {
        email: 'salim.specialist@example.com',
        passwordHash: '$2b$10$uC0Bpvy.buk..qS0bkkCmOs.zAV/QXpVZl8vGeOawx2UY8ailqBeK',
        firstName: 'Salim',
        lastName: 'Specialist',
        phoneNumber: '+33123456789',
        locale: 'fr',
        roleId: specialistRole.id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'lina.client@example.com',
        passwordHash: '$2b$10$uC0Bpvy.buk..qS0bkkCmOs.zAV/QXpVZl8vGeOawx2UY8ailqBeK',
        firstName: 'Lina',
        lastName: 'Client',
        phoneNumber: '+971234567890',
        locale: 'ar',
        roleId: clientRole.id,
      },
    }),
  ]);

  const categoriesData = [
    {
      slug: 'immigration-support',
      nameTranslations: {
        en: 'Immigration Support',
        fr: "Assistance à l'immigration",
        ar: 'دعم الهجرة',
      },
      descriptionTranslations: {
        en: 'Guidance for visa processing and residency applications.',
        fr: 'Conseils pour le traitement des visas et les demandes de résidence.',
        ar: 'إرشادات لإجراءات التأشيرة وطلبات الإقامة.',
      },
    },
    {
      slug: 'business-consulting',
      nameTranslations: {
        en: 'Business Consulting',
        fr: 'Conseil en affaires',
        ar: 'استشارات الأعمال',
      },
      descriptionTranslations: {
        en: 'Tailored advisory services for entrepreneurs and startups.',
        fr: 'Conseils personnalisés pour les entrepreneurs et les startups.',
        ar: 'خدمات استشارية مخصصة لرواد الأعمال والشركات الناشئة.',
      },
    },
  ];

  const categories = await Promise.all(
    categoriesData.map((category) =>
      prisma.serviceCategory.create({
        data: {
          slug: category.slug,
          translations: {
            create: Object.entries(category.nameTranslations).map(([locale, name]) => ({
              locale,
              name,
              description: category.descriptionTranslations?.[locale],
            })),
          },
        },
      }),
    ),
  );

  const categoriesBySlug = new Map(categories.map((category) => [category.slug, category]));

  const servicesData = [
    {
      slug: 'residency-application-review',
      categorySlug: 'immigration-support',
      nameTranslations: {
        en: 'Residency Application Review',
        fr: 'Révision de dossier de résidence',
        ar: 'مراجعة طلب الإقامة',
      },
      descriptionTranslations: {
        en: 'Detailed review of your residency application documents.',
        fr: 'Révision détaillée des documents de votre demande de résidence.',
        ar: 'مراجعة تفصيلية لمستندات طلب الإقامة الخاصة بك.',
      },
      durationMinutes: 60,
      price: '150.00',
    },
    {
      slug: 'startup-roadmap-session',
      categorySlug: 'business-consulting',
      nameTranslations: {
        en: 'Startup Roadmap Session',
        fr: 'Séance de feuille de route pour startup',
        ar: 'جلسة خارطة طريق للشركات الناشئة',
      },
      descriptionTranslations: {
        en: 'Plan your first 90 days with an expert consultant.',
        fr: 'Planifiez vos 90 premiers jours avec un consultant expert.',
        ar: 'خطط لأول 90 يومًا مع مستشار خبير.',
      },
      durationMinutes: 45,
      price: '95.00',
    },
  ];

  const services = [];

  for (const service of servicesData) {
    const category = categoriesBySlug.get(service.categorySlug);
    if (!category) {
      throw new Error(`Missing service category for slug ${service.categorySlug}`);
    }

    services.push(
      await prisma.service.create({
        data: {
          slug: service.slug,
          categoryId: category.id,
          durationMinutes: service.durationMinutes,
          price: service.price,
          translations: {
            create: Object.entries(service.nameTranslations).map(([locale, name]) => ({
              locale,
              name,
              description: service.descriptionTranslations?.[locale],
            })),
          },
        },
      }),
    );
  }

  const servicesBySlug = new Map(services.map((service) => [service.slug, service]));
  const residencyService = servicesBySlug.get('residency-application-review');
  const startupService = servicesBySlug.get('startup-roadmap-session');

  if (!residencyService || !startupService) {
    throw new Error('Missing seeded services for document template creation.');
  }

  const documentTemplates = await Promise.all([
    prisma.documentTemplate.create({
      data: {
        serviceId: residencyService.id,
        locale: 'en',
        name: 'Residency Checklist (EN)',
        content:
          'Thank you for choosing our consultancy. Please review the attached checklist to complete your residency application.',
        metadata: {
          tone: 'formal',
          locale: 'en',
        },
      },
    }),
    prisma.documentTemplate.create({
      data: {
        serviceId: residencyService.id,
        locale: 'fr',
        name: 'Liste de contrôle de résidence (FR)',
        content:
          "Merci d'avoir choisi notre cabinet. Veuillez consulter la liste de contrôle ci-jointe pour finaliser votre demande de résidence.",
        metadata: {
          tone: 'formel',
          locale: 'fr',
        },
      },
    }),
    prisma.documentTemplate.create({
      data: {
        serviceId: startupService.id,
        locale: 'ar',
        name: 'قائمة متابعة جلسة الانطلاقة (AR)',
        content:
          'شكرًا لاختيارك فريقنا. يرجى مراجعة خطة الـ 90 يومًا المرفقة لجلسة خارطة الطريق الخاصة بك.',
        metadata: {
          tone: 'supportive',
          locale: 'ar',
        },
      },
    }),
  ]);

  const [residencyTemplateEn, , startupTemplateAr] = documentTemplates;

  const appointmentOne = await prisma.appointment.create({
    data: {
      userId: clientUser.id,
      serviceId: residencyService.id,
      scheduledAt: new Date('2024-11-05T09:30:00.000Z'),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Customer prefers virtual meeting via Zoom.',
      locale: 'en',
    },
  });

  const appointmentTwo = await prisma.appointment.create({
    data: {
      userId: clientUser.id,
      serviceId: startupService.id,
      scheduledAt: new Date('2024-11-08T14:00:00.000Z'),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Include business partner in discussion.',
      locale: 'ar',
    },
  });

  await prisma.document.create({
    data: {
      userId: clientUser.id,
      appointmentId: appointmentOne.id,
      templateId: residencyTemplateEn.id,
      locale: 'en',
      title: 'Residency Application Checklist',
      content:
        'Please gather the documents outlined in this checklist before our session. We will review each item together.',
      metadata: {
        generatedBy: 'system',
        category: 'immigration-support',
      },
    },
  });

  await prisma.document.create({
    data: {
      userId: clientUser.id,
      appointmentId: appointmentTwo.id,
      templateId: startupTemplateAr.id,
      locale: 'ar',
      title: 'خطة الـ 90 يومًا للشركة الناشئة',
      content: 'يرجى مراجعة قائمة الخطوات الأولية والاستعداد لمناقشتها خلال جلستنا القادمة.',
      metadata: {
        generatedBy: 'consultant',
        category: 'business-consulting',
      },
    },
  });

  await prisma.conversationLog.createMany({
    data: [
      {
        appointmentId: appointmentOne.id,
        userId: clientUser.id,
        participantRole: ConversationParticipant.CLIENT,
        locale: 'en',
        message: 'Could you confirm the list of documents I need to upload before our meeting?',
        payload: {
          channel: 'chat',
        },
      },
      {
        appointmentId: appointmentOne.id,
        userId: specialistUser.id,
        participantRole: ConversationParticipant.SPECIALIST,
        locale: 'en',
        message:
          'Absolutely. Please upload your passport scan, proof of residence, and current visa documents.',
        payload: {
          channel: 'chat',
        },
      },
      {
        appointmentId: appointmentOne.id,
        participantRole: ConversationParticipant.SYSTEM,
        locale: 'en',
        message: 'Reminder: Your appointment will start in 24 hours.',
        payload: {
          type: 'reminder',
        },
      },
    ],
  });

  await prisma.conversationLog.create({
    data: {
      appointmentId: appointmentTwo.id,
      userId: specialistUser.id,
      participantRole: ConversationParticipant.AI_ASSISTANT,
      locale: 'ar',
      message: 'تم إنشاء مسودة خطة العمل الأولية بناءً على نموذجك. يرجى مراجعتها قبل الجلسة.',
      payload: {
        generated: true,
      },
    },
  });

  console.info('Database has been seeded with baseline localized data.');
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
