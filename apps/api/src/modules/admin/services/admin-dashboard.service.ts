import { Injectable, Logger } from '@nestjs/common';
import { AppointmentStatus, DocumentUploadStatus } from '@prisma/client';

import { PrismaService } from '@prisma/prisma.service';

import { AdminDashboardMetricsDto } from '../dto/admin-dashboard-metrics.dto';

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(): Promise<AdminDashboardMetricsDto> {
    this.logger.verbose('Fetching admin dashboard metrics');

    const [totalUsers, pendingAppointments, pendingDocuments, activeServices] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.appointment.count({
        where: {
          status: AppointmentStatus.SCHEDULED,
        },
      }),
      this.prisma.documentUpload.count({
        where: {
          status: DocumentUploadStatus.PENDING,
        },
      }),
      this.prisma.service.count({
        where: {
          isActive: true,
        },
      }),
    ]);

    this.logger.verbose(
      `Metrics fetched - Users: ${totalUsers}, Appointments: ${pendingAppointments}, Documents: ${pendingDocuments}, Services: ${activeServices}`,
    );

    return {
      totalUsers,
      pendingAppointments,
      pendingDocuments,
      activeServices,
    };
  }
}
