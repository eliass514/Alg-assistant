import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ROLE } from '@common/constants/role.constants';
import { Roles } from '@common/decorators/roles.decorator';

import { AdminLogsService } from '../services/admin-logs.service';
import {
  AdminConversationLogsQueryDto,
  AdminDocumentVerificationLogsQueryDto,
} from '../dto/admin-logs-query.dto';

@ApiTags('admin-logs')
@ApiBearerAuth()
@Controller({ path: 'admin/logs', version: '1' })
@Roles(ROLE.ADMIN)
export class AdminLogsController {
  constructor(private readonly adminLogsService: AdminLogsService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'List chatbot conversation logs for admin' })
  @ApiOkResponse({ description: 'Conversation logs retrieved' })
  listConversationLogs(@Query() query: AdminConversationLogsQueryDto) {
    return this.adminLogsService.listConversationLogs(query);
  }

  @Get('document-verifications')
  @ApiOperation({ summary: 'List document verification logs for admin' })
  @ApiOkResponse({ description: 'Document verification logs retrieved' })
  listDocumentVerificationLogs(@Query() query: AdminDocumentVerificationLogsQueryDto) {
    return this.adminLogsService.listDocumentVerificationLogs(query);
  }
}
