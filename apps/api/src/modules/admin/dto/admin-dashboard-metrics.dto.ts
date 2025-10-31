import { ApiProperty } from '@nestjs/swagger';

export class AdminDashboardMetricsDto {
  @ApiProperty({
    description: 'Total number of registered users',
    example: 1250,
  })
  totalUsers!: number;

  @ApiProperty({
    description: 'Number of pending appointments',
    example: 38,
  })
  pendingAppointments!: number;

  @ApiProperty({
    description: 'Number of pending document reviews',
    example: 24,
  })
  pendingDocuments!: number;

  @ApiProperty({
    description: 'Number of active services',
    example: 12,
  })
  activeServices!: number;
}
