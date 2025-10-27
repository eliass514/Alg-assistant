import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { ROLE } from '@common/constants/role.constants';
import { Public } from '@common/decorators/public.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { ResourceIdParamDto } from '@acme/shared-dto';

import { CreateDocumentTemplateDto } from './dto/create-document-template.dto';
import { DocumentTemplateQueryDto } from './dto/document-template-query.dto';
import { UpdateDocumentTemplateDto } from './dto/update-document-template.dto';
import { DocumentTemplatesService } from './document-templates.service';

@ApiTags('document-templates')
@Controller({ path: 'document-templates', version: '1' })
export class DocumentTemplatesController {
  constructor(private readonly documentTemplatesService: DocumentTemplatesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List available document templates, optionally filtered by service' })
  @ApiOkResponse({ description: 'Document templates retrieved' })
  findAll(@Query() query: DocumentTemplateQueryDto) {
    return this.documentTemplatesService.findAll(query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get the details of a specific document template' })
  @ApiOkResponse({ description: 'Document template retrieved' })
  findOne(@Param() params: ResourceIdParamDto) {
    return this.documentTemplatesService.findOne(params.id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(ROLE.ADMIN)
  @ApiOperation({ summary: 'Create a document template (admin only)' })
  @ApiCreatedResponse({ description: 'Document template created' })
  create(@Body() createDto: CreateDocumentTemplateDto) {
    return this.documentTemplatesService.create(createDto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(ROLE.ADMIN)
  @ApiOperation({ summary: 'Update a document template (admin only)' })
  @ApiOkResponse({ description: 'Document template updated' })
  update(@Param() params: ResourceIdParamDto, @Body() updateDto: UpdateDocumentTemplateDto) {
    return this.documentTemplatesService.update(params.id, updateDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(ROLE.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a document template (admin only)' })
  @ApiNoContentResponse({ description: 'Document template deleted' })
  async remove(@Param() params: ResourceIdParamDto) {
    await this.documentTemplatesService.remove(params.id);
  }
}
