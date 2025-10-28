import {
  BadRequestException,
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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { ROLE } from '@common/constants/role.constants';
import { Roles } from '@common/decorators/roles.decorator';
import { ResourceIdParamDto } from '@acme/shared-dto';
import { DocumentTemplateQueryDto } from '@modules/document-templates/dto/document-template-query.dto';

import { AdminDocumentTemplatesService } from '../services/admin-document-templates.service';
import { AdminCreateDocumentTemplateDto } from '../dto/admin-create-document-template.dto';
import { AdminUpdateDocumentTemplateDto } from '../dto/admin-update-document-template.dto';
import { AdminUploadTemplateFileDto } from '../dto/admin-upload-template-file.dto';

@ApiTags('admin-document-templates')
@ApiBearerAuth()
@Controller({ path: 'admin/document-templates', version: '1' })
@Roles(ROLE.ADMIN)
export class AdminDocumentTemplatesController {
  constructor(private readonly adminDocumentTemplatesService: AdminDocumentTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List document templates (admin)' })
  @ApiOkResponse({ description: 'Document templates retrieved' })
  list(@Query() query: DocumentTemplateQueryDto) {
    return this.adminDocumentTemplatesService.listTemplates(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document template by ID (admin)' })
  @ApiOkResponse({ description: 'Document template retrieved' })
  getById(@Param() params: ResourceIdParamDto) {
    return this.adminDocumentTemplatesService.getTemplateById(params.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a document template' })
  @ApiCreatedResponse({ description: 'Document template created' })
  create(@Body() dto: AdminCreateDocumentTemplateDto) {
    return this.adminDocumentTemplatesService.createTemplate(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a document template' })
  @ApiOkResponse({ description: 'Document template updated' })
  update(@Param() params: ResourceIdParamDto, @Body() dto: AdminUpdateDocumentTemplateDto) {
    return this.adminDocumentTemplatesService.updateTemplate(params.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a document template' })
  @ApiNoContentResponse({ description: 'Document template deleted' })
  remove(@Param() params: ResourceIdParamDto) {
    return this.adminDocumentTemplatesService.deleteTemplate(params.id);
  }

  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a template file and create a new version' })
  @ApiCreatedResponse({ description: 'Template file uploaded and version created' })
  async uploadTemplateFile(
    @Param() params: ResourceIdParamDto,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AdminUploadTemplateFileDto,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.adminDocumentTemplatesService.uploadTemplateFile(
      params.id,
      file.buffer,
      file.originalname,
      dto.description,
      dto.metadata,
    );
  }
}
