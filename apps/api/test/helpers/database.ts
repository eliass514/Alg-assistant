import * as bcrypt from 'bcrypt';

import { ROLE } from '@common/constants/role.constants';
import { PrismaService } from '@prisma/prisma.service';
import { Service, ServiceCategory } from '@prisma/client';

export interface SeedData {
  admin: {
    email: string;
    password: string;
  };
  categories: ServiceCategory[];
  services: Service[];
}

export const resetDatabase = async (prisma: PrismaService): Promise<void> => {
  await prisma.refreshToken.deleteMany();
  await prisma.conversationLog.deleteMany();
  await prisma.document.deleteMany();
  await prisma.documentUploadValidation.deleteMany();
  await prisma.documentUploadStatusHistory.deleteMany();
  await prisma.documentUpload.deleteMany();
  await prisma.validationRule.deleteMany();
  await prisma.documentTemplateVersion.deleteMany();
  await prisma.documentTemplateService.deleteMany();
  await prisma.documentTemplate.deleteMany();
  await prisma.queueTicket.deleteMany();
  await prisma.appointmentStatusHistory.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.appointmentSlot.deleteMany();
  await prisma.serviceTranslation.deleteMany();
  await prisma.serviceCategoryTranslation.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
};

export const seedBaseData = async (prisma: PrismaService): Promise<SeedData> => {
  const permissionsData = [
    { key: 'manage_users', description: 'Create, update, and delete user accounts' },
    { key: 'view_users', description: 'View user directory and profiles' },
    { key: 'manage_services', description: 'Create and update services catalog' },
    { key: 'view_services', description: 'View services catalog' },
  ];

  const permissions = await Promise.all(
    permissionsData.map((permission) =>
      prisma.permission.create({
        data: permission,
      }),
    ),
  );

  const permissionsByKey = new Map(permissions.map((permission) => [permission.key, permission]));

  const connectPermissions = (keys: string[]) =>
    keys.map((key) => {
      const permission = permissionsByKey.get(key);
      if (!permission) {
        throw new Error(`Permission ${key} not found`);
      }

      return {
        permission: {
          connect: {
            id: permission.id,
          },
        },
      };
    });

  const adminRole = await prisma.role.create({
    data: {
      name: ROLE.ADMIN,
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

  await prisma.role.create({
    data: {
      name: ROLE.SPECIALIST,
      description: 'Subject matter experts delivering services',
      rolePermissions: {
        create: connectPermissions(['view_services']),
      },
    },
  });

  await prisma.role.create({
    data: {
      name: ROLE.CLIENT,
      description: 'End-users booking appointments and receiving documents',
      rolePermissions: {
        create: connectPermissions(['view_services']),
      },
    },
  });

  const adminPassword = 'Admin123!';
  const adminEmail = 'amina.admin@example.com';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      firstName: 'Amina',
      lastName: 'Admin',
      locale: 'en',
      roleId: adminRole.id,
    },
  });

  const categories = await Promise.all([
    prisma.serviceCategory.create({
      data: {
        slug: 'immigration-support',
        translations: {
          create: [
            {
              locale: 'en',
              name: 'Immigration Support',
              description: 'Guidance for visa processing and residency applications.',
            },
            {
              locale: 'fr',
              name: "Assistance à l'immigration",
              description: 'Conseils pour le traitement des visas et les demandes de résidence.',
            },
            {
              locale: 'ar',
              name: 'دعم الهجرة',
              description: 'إرشادات لإجراءات التأشيرة وطلبات الإقامة.',
            },
          ],
        },
      },
    }),
    prisma.serviceCategory.create({
      data: {
        slug: 'business-consulting',
        translations: {
          create: [
            {
              locale: 'en',
              name: 'Business Consulting',
              description: 'Tailored advisory services for entrepreneurs and startups.',
            },
            {
              locale: 'fr',
              name: 'Conseil en affaires',
              description: 'Conseils personnalisés pour les entrepreneurs et les startups.',
            },
            {
              locale: 'ar',
              name: 'استشارات الأعمال',
              description: 'خدمات استشارية مخصصة لرواد الأعمال والشركات الناشئة.',
            },
          ],
        },
      },
    }),
  ]);

  const services = await Promise.all([
    prisma.service.create({
      data: {
        slug: 'residency-application-review',
        category: {
          connect: {
            id: categories[0].id,
          },
        },
        durationMinutes: 60,
        price: '150.00',
        translations: {
          create: [
            {
              locale: 'en',
              name: 'Residency Application Review',
              summary: 'Detailed checklist session',
              description: 'Detailed review of your residency application documents.',
            },
            {
              locale: 'fr',
              name: 'Révision de dossier de résidence',
              description: 'Révision détaillée des documents de votre demande de résidence.',
            },
            {
              locale: 'ar',
              name: 'مراجعة طلب الإقامة',
              description: 'مراجعة تفصيلية لمستندات طلب الإقامة الخاصة بك.',
            },
          ],
        },
      },
    }),
    prisma.service.create({
      data: {
        slug: 'startup-roadmap-session',
        category: {
          connect: {
            id: categories[1].id,
          },
        },
        durationMinutes: 45,
        price: '95.00',
        translations: {
          create: [
            {
              locale: 'en',
              name: 'Startup Roadmap Session',
              summary: 'Plan your first 90 days',
              description: 'Plan your first 90 days with an expert consultant.',
            },
            {
              locale: 'fr',
              name: 'Séance de feuille de route pour startup',
              description: 'Planifiez vos 90 premiers jours avec un consultant expert.',
            },
            {
              locale: 'ar',
              name: 'جلسة خارطة طريق للشركات الناشئة',
              description: 'خطط لأول 90 يومًا مع مستشار خبير.',
            },
          ],
        },
      },
    }),
  ]);

  return {
    admin: {
      email: adminEmail,
      password: adminPassword,
    },
    categories,
    services,
  };
};
