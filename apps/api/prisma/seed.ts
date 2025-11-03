import {
  AppointmentStatus,
  ConversationParticipant,
  PrismaClient,
  QueueTicketStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data to keep the seed idempotent
  await prisma.refreshToken.deleteMany();
  await prisma.conversationLog.deleteMany();
  await prisma.document.deleteMany();
  await prisma.queueTicket.deleteMany();
  await prisma.appointmentStatusHistory.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.appointmentSlot.deleteMany();
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
    {
      slug: 'civil-documents',
      nameTranslations: {
        en: 'Civil Documents',
        fr: 'Documents civils',
        ar: 'الوثائق المدنية',
      },
      descriptionTranslations: {
        en: 'Assistance with national identity cards, civil status documents, and administrative procedures.',
        fr: "Assistance pour les cartes d'identité nationales, documents d'état civil et démarches administratives.",
        ar: 'مساعدة في الحصول على بطاقات الهوية الوطنية ووثائق الحالة المدنية والإجراءات الإدارية.',
      },
    },
    {
      slug: 'employment-services',
      nameTranslations: {
        en: 'Employment Services',
        fr: "Services d'emploi",
        ar: 'خدمات التوظيف',
      },
      descriptionTranslations: {
        en: 'Job seeker support and unemployment benefits.',
        fr: "Aide aux demandeurs d'emploi et allocations chômage.",
        ar: 'دعم الباحثين عن عمل وإعانات البطالة.',
      },
    },
    {
      slug: 'housing-services',
      nameTranslations: {
        en: 'Housing Services',
        fr: 'Services de logement',
        ar: 'خدمات السكن',
      },
      descriptionTranslations: {
        en: 'Government housing programs and support for citizens.',
        fr: 'Programmes de logement gouvernementaux et aide aux citoyens.',
        ar: 'برامج الإسكان الحكومية والدعم للمواطنين.',
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

  type ServiceSeedData = {
    slug: string;
    categorySlug: string;
    nameTranslations: Record<string, string>;
    descriptionTranslations?: Record<string, string>;
    durationMinutes: number;
    price: string;
    metadata?: Record<string, unknown>;
  };

  const servicesData: ServiceSeedData[] = [
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
    {
      slug: 'unemployment-allowance',
      categorySlug: 'employment-services',
      nameTranslations: {
        en: 'Unemployment Allowance',
        fr: 'Allocation Chômage',
        ar: 'منحة البطالة',
      },
      descriptionTranslations: {
        en: 'A monthly allowance for first-time job seekers in Algeria.',
        fr: "Une allocation mensuelle pour les demandeurs d'emploi primo-demandeurs (ceux qui n'ont jamais travaillé).",
        ar: 'إعانة مالية شهرية للبطالين طالبي الشغل لأول مرة.',
      },
      durationMinutes: 30,
      price: '0.00',
      metadata: {
        currency: 'DZD',
        tags: ['Algeria', 'Employment', 'Allowance', 'ANEM', 'Social Support'],
        eligibilityConditions: [
          'Must be Algerian national and resident in Algeria.',
          'Aged 19 to 40.',
          'Registered as a first-time job seeker (primo-demandeur) at ANEM.',
          'Must not have any income (Attestation de non-activité).',
          'Must not be receiving any social security benefits (CNAS/CASNOS).',
        ],
        requiredDocuments: [
          "Proof of registration at ANEM (Carte d'inscription).",
          'Biometric ID Card (CNIBE).',
          'Diploma or professional training certificate (if any).',
          "A 'Chèque barré' (voided check) for your bank account (CCP or bank).",
        ],
        steps: [
          'You MUST first register as a job seeker at your local ANEM agency.',
          "Once registered, log in to the 'minha.anem.dz' online platform with your ID and registration numbers.",
          'Fill out the online application for the allowance.',
          'You will be given an appointment (rendez-vous) to verify your file.',
          'Attend your ANEM appointment with your documents.',
        ],
      },
    },
    {
      slug: 'aadl-rent-to-own-program',
      categorySlug: 'housing-services',
      nameTranslations: {
        en: 'AADL Housing Program (Rent-to-Own)',
        fr: 'Programme AADL (Location-Vente)',
        ar: 'برنامج عدل (البيع بالإيجار)',
      },
      descriptionTranslations: {
        en: "The government's rent-to-own housing program for middle-income citizens.",
        fr: "Le programme de logement 'Location-Vente' du gouvernement pour les citoyens à revenu moyen.",
        ar: "برنامج السكن الحكومي 'البيع بالإيجار' للمواطنين ذوي الدخل المتوسط.",
      },
      durationMinutes: 30,
      price: '0.00',
      metadata: {
        currency: 'DZD',
        tags: ['Algeria', 'Housing', 'AADL', 'Government Program'],
        eligibilityConditions: [
          'Must be Algerian national.',
          "Applicant's (and spouse's) monthly income must be between 1 and 6 times the national minimum wage (SNMG).",
          'Must not own any property (or land for building).',
          'Must not have received any previous state aid for housing.',
        ],
        requiredDocuments: [
          'Original S12 Birth Certificate (for applicant and spouse).',
          'Biometric ID Card (CNIBE).',
          'Certificate of Residence (Certificat de résidence).',
          'Proof of Income (Attestation de travail and last 3 Fiches de Paie).',
          "A 'Déclaration sur l'honneur' (sworn statement) confirming you don't own other property (form provided by AADL).",
          "Attestation de non-affiliation CNAS and/or CASNOS (for both applicant and spouse, if one doesn't work) to prove no other income.",
        ],
        steps: [
          "Wait for the government to officially 'open' the program (e.g., AADL 3).",
          'When open, you MUST register online at the official AADL website (inscription.aadl.dz) *very* quickly.',
          'Print your registration receipt.',
          'Wait (sometimes for months or years) to be called to submit your physical file (dossier).',
          'Pay the first installment (tranche) when instructed.',
        ],
      },
    },
    {
      slug: 'algerian-biometric-id-card',
      categorySlug: 'civil-documents',
      nameTranslations: {
        en: 'Algerian Biometric National ID Card (CNIBE)',
        fr: "Carte Nationale d'Identité Biométrique (CNIBE)",
        ar: 'بطاقة التعريف الوطنية البيومترية',
      },
      descriptionTranslations: {
        en: 'The official biometric ID card required for all Algerian citizens. This is the first step for getting a passport.',
        fr: "La carte d'identité biométrique officielle requise pour tous les citoyens algériens. C'est la première étape pour obtenir un passeport.",
        ar: 'بطاقة الهوية البيومترية الرسمية المطلوبة لجميع المواطنين الجزائريين. هذه هي الخطوة الأولى للحصول على جواز السفر.',
      },
      durationMinutes: 30,
      price: '0.00',
      metadata: {
        currency: 'DZD',
        tags: ['Algeria', 'Identity', 'Biometric', 'Civil Status'],
        requiredDocumentsNew: [
          "Extrait d'acte de naissance S12 (Special Birth Certificate S12)",
          'Certificat de résidence (Proof of Residence)',
          '4 passport-sized photos (recent, white background)',
          'Blood type card (Carte de groupage sanguin)',
          'Fee receipt (Timbre fiscal)',
        ],
        requiredDocumentsRenewal: [
          'The expiring CNIBE card',
          'Certificat de résidence (if your address changed)',
          '1 passport-sized photo',
        ],
        steps: [
          'Gather all required documents.',
          'Complete the pre-application online at the Ministry of Interior website.',
          'Print your pre-application receipt.',
          'Book your biometric appointment (rendez-vous) at your local daïra.',
          'Attend your appointment with your complete file.',
          'Track your application status online.',
        ],
      },
    },
    {
      slug: 'special-birth-certificate-s12',
      categorySlug: 'civil-documents',
      nameTranslations: {
        en: 'Special Birth Certificate (S12)',
        fr: "Extrait d'acte de naissance S12",
        ar: 'شهادة الميلاد الخاصة S12',
      },
      descriptionTranslations: {
        en: 'A special, secure birth certificate required ONLY for applying for a biometric ID card or passport. You cannot use a regular birth certificate.',
        fr: "Un certificat de naissance spécial et sécurisé requis UNIQUEMENT pour demander une carte d'identité biométrique ou un passeport. Vous ne pouvez pas utiliser un certificat de naissance ordinaire.",
        ar: 'شهادة ميلاد خاصة وآمنة مطلوبة فقط للتقدم بطلب للحصول على بطاقة هوية بيومترية أو جواز سفر. لا يمكنك استخدام شهادة ميلاد عادية.',
      },
      durationMinutes: 15,
      price: '0.00',
      metadata: {
        currency: 'DZD',
        tags: ['Algeria', 'Birth Certificate', 'S12', 'Civil Status', 'Required Document'],
        purpose: 'Required for biometric ID card (CNIBE) and passport applications',
        optionOnline: {
          title: 'Online (If Digitized)',
          steps: [
            "Visit the Ministry of Interior's online portal.",
            'Fill in your information (Name, Date of Birth, Municipality).',
            'If your birth is digitized, you can download and print the S12 instantly.',
          ],
        },
        optionInPerson: {
          title: 'In-Person at Municipality',
          steps: [
            'Go to the municipality (APC) where you were born.',
            "Request the 'S12' for biometric documents.",
            'Provide your standard birth certificate or family book.',
          ],
        },
        importantNotes: [
          'The S12 is different from a regular birth certificate (acte de naissance ordinaire).',
          'It contains enhanced security features and is the only format accepted for biometric documents.',
          'If your birth record is not digitized, you must request it in person at your birth municipality.',
        ],
      },
    },
    {
      slug: 'algerian-biometric-passport',
      categorySlug: 'civil-documents',
      nameTranslations: {
        en: 'Algerian Biometric Passport',
        fr: 'Passeport Biométrique',
        ar: 'جواز السفر البيومتري',
      },
      descriptionTranslations: {
        en: 'The official Algerian passport for international travel.',
        fr: 'Le passeport officiel algérien pour les voyages internationaux.',
        ar: 'جواز السفر الجزائري الرسمي للسفر الدولي.',
      },
      durationMinutes: 30,
      price: '6000.00',
      metadata: {
        currency: 'DZD',
        tags: ['Algeria', 'Passport', 'Biometric', 'Travel', 'Civil Status'],
        requiredDocuments: [
          'Biometric ID Card (CNIBE) (original and copy)',
          "S12 Birth Certificate (if it's your first time applying)",
          'Proof of Residence (Certificat de résidence)',
          'Receipt for the passport fee (Timbre fiscal - 6,000 DZD)',
          '2 passport-sized photos (recent, white background)',
          'Blood type card',
          'Proof of National Service status (for men aged 18+)',
        ],
        steps: [
          'Gather all documents. Ensure your CNIBE is valid.',
          'Go to the Ministry of Interior website to fill the application form and get an appointment.',
          'Attend your biometric appointment at the daïra.',
          'Submit your complete file.',
          'Track your passport status via the website or SMS.',
        ],
      },
    },
    {
      slug: 'algerian-drivers-license',
      categorySlug: 'civil-documents',
      nameTranslations: {
        en: "Algerian Driver's License",
        fr: 'Permis de Conduire',
        ar: 'رخصة السياقة',
      },
      descriptionTranslations: {
        en: "Obtain a new driver's license or renew an existing one.",
        fr: 'Obtenir un nouveau permis de conduire ou renouveler un permis existant.',
        ar: 'الحصول على رخصة سياقة جديدة أو تجديد رخصة حالية.',
      },
      durationMinutes: 45,
      price: '0.00',
      metadata: {
        currency: 'DZD',
        tags: ['Algeria', 'Driving', 'License', 'Transport'],
        requiredDocumentsNew: [
          'Completed application form',
          'Biometric ID Card (CNIBE) (original and copy)',
          'Proof of Residence (Certificat de résidence)',
          'Medical certificate (from an approved doctor)',
          '2 passport-sized photos',
          'Fee receipt (Timbre fiscal)',
        ],
        stepsNew: [
          'Enroll in a certified driving school.',
          'Pass the written (Code) and practical (Créneau/Circulation) driving tests.',
          'Get your certificate of success from the driving school.',
          'Gather all required documents.',
          'Submit your complete file to the daïra.',
        ],
      },
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
          ...(service.metadata ? { metadata: service.metadata } : {}),
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

  const [residencySlotPrimary, residencySlotFollowUp, startupSlotPrimary, startupSlotFollowUp] =
    await Promise.all([
      prisma.appointmentSlot.create({
        data: {
          serviceId: residencyService.id,
          startAt: new Date('2024-11-05T09:30:00.000Z'),
          endAt: new Date('2024-11-05T10:30:00.000Z'),
          timezone: 'UTC',
          capacity: 1,
          bufferBeforeMinutes: 30,
          bufferAfterMinutes: 30,
        },
      }),
      prisma.appointmentSlot.create({
        data: {
          serviceId: residencyService.id,
          startAt: new Date('2024-11-12T09:30:00.000Z'),
          endAt: new Date('2024-11-12T10:30:00.000Z'),
          timezone: 'UTC',
          capacity: 2,
          bufferBeforeMinutes: 15,
          bufferAfterMinutes: 15,
        },
      }),
      prisma.appointmentSlot.create({
        data: {
          serviceId: startupService.id,
          startAt: new Date('2024-11-08T14:00:00.000Z'),
          endAt: new Date('2024-11-08T14:45:00.000Z'),
          timezone: 'UTC',
          capacity: 1,
          bufferBeforeMinutes: 10,
          bufferAfterMinutes: 10,
        },
      }),
      prisma.appointmentSlot.create({
        data: {
          serviceId: startupService.id,
          startAt: new Date('2024-11-15T14:00:00.000Z'),
          endAt: new Date('2024-11-15T14:45:00.000Z'),
          timezone: 'UTC',
          capacity: 2,
          bufferBeforeMinutes: 10,
          bufferAfterMinutes: 10,
        },
      }),
    ]);

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
      slotId: residencySlotPrimary.id,
      scheduledAt: new Date('2024-11-05T09:30:00.000Z'),
      status: AppointmentStatus.CONFIRMED,
      notes: 'Customer prefers virtual meeting via Zoom.',
      locale: 'en',
      timezone: 'UTC',
    },
  });

  const appointmentTwo = await prisma.appointment.create({
    data: {
      userId: clientUser.id,
      serviceId: startupService.id,
      slotId: startupSlotPrimary.id,
      scheduledAt: new Date('2024-11-08T14:00:00.000Z'),
      status: AppointmentStatus.SCHEDULED,
      notes: 'Include business partner in discussion.',
      locale: 'ar',
      timezone: 'UTC',
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

  await prisma.queueTicket.createMany({
    data: [
      {
        userId: clientUser.id,
        serviceId: residencyService.id,
        slotId: residencySlotFollowUp.id,
        status: QueueTicketStatus.WAITING,
        position: 1,
        desiredFrom: new Date('2024-11-12T09:30:00.000Z'),
        desiredTo: new Date('2024-11-12T10:30:00.000Z'),
        timezone: 'UTC',
        notes: 'Looking for a morning slot if any cancellations happen.',
      },
      {
        userId: clientUser.id,
        serviceId: startupService.id,
        slotId: startupSlotFollowUp.id,
        status: QueueTicketStatus.WAITING,
        position: 1,
        desiredFrom: new Date('2024-11-15T14:00:00.000Z'),
        desiredTo: new Date('2024-11-15T16:00:00.000Z'),
        timezone: 'UTC',
        notes: 'Happy to take any afternoon slot.',
      },
    ],
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
