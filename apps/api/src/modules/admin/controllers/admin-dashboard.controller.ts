import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ROLE } from '@common/constants/role.constants';
import { Roles } from '@common/decorators/roles.decorator';

import { AdminDashboardService } from '../services/admin-dashboard.service';
import { AdminDashboardMetricsDto } from '../dto/admin-dashboard-metrics.dto';

@ApiTags('admin-dashboard')
@ApiBearerAuth()
@Controller({ path: 'admin/dashboard', version: '1' })
@Roles(ROLE.ADMIN)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get dashboard metrics for admin' })
  @ApiOkResponse({
    description: 'Dashboard metrics retrieved',
    type: AdminDashboardMetricsDto,
  })
  getMetrics(): Promise<AdminDashboardMetricsDto> {
    return this.adminDashboardService.getMetrics();
  }
}
