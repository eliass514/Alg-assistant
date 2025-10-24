import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PaginationQueryDto, ResourceIdParamDto } from '@acme/shared-dto';

import { DocumentsService } from '@modules/documents/documents.service';

@ApiTags('documents')
@Controller({ path: 'documents', version: '1' })
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List documents' })
  @ApiOkResponse({ description: 'Documents retrieved' })
  list(@Query() query: PaginationQueryDto) {
    return this.documentsService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document details' })
  @ApiOkResponse({ description: 'Document retrieved' })
  getById(@Param() params: ResourceIdParamDto) {
    return this.documentsService.getById(params.id);
  }
}
