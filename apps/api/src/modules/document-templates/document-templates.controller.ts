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
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { PaginationQueryDto, ResourceIdParamDto } from '@acme/shared-dto';

import { CreateDocumentTemplateDto } from './dto/create-document-template.dto';
import { UpdateDocumentTemplateDto } from './dto/update-document-template.dto';
import { DocumentTemplatesService } from './document-templates.service';

@ApiTags('document-templates')
@Controller({ path: 'document-templates', version: '1' })
export class DocumentTemplatesController {
  constructor(private readonly documentTemplatesService: DocumentTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List document templates' })
  @ApiOkResponse({ description: 'Document templates retrieved' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.documentTemplatesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document template' })
  @ApiOkResponse({ description: 'Document template retrieved' })
  findOne(@Param() params: ResourceIdParamDto) {
    return this.documentTemplatesService.findOne(params.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a document template' })
  @ApiCreatedResponse({ description: 'Document template created' })
  create(@Body() createDto: CreateDocumentTemplateDto) {
    return this.documentTemplatesService.create(createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a document template' })
  @ApiOkResponse({ description: 'Document template updated' })
  update(@Param() params: ResourceIdParamDto, @Body() updateDto: UpdateDocumentTemplateDto) {
    return this.documentTemplatesService.update(params.id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a document template' })
  @ApiNoContentResponse({ description: 'Document template deleted' })
  async remove(@Param() params: ResourceIdParamDto) {
    await this.documentTemplatesService.remove(params.id);
  }
}
