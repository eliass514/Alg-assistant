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
import type { Express } from 'express';
import { memoryStorage } from 'multer';

import { ROLE } from '@common/constants/role.constants';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { ResourceIdParamDto } from '@acme/shared-dto';
import { AuthenticatedUser } from '@modules/auth/interfaces/authenticated-user.interface';

import { CreateDocumentUploadDto } from './dto/create-document-upload.dto';
import { DocumentUploadQueryDto } from './dto/document-upload-query.dto';
import { UpdateDocumentUploadDto } from './dto/update-document-upload.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentUploadsService } from './document-uploads.service';

@ApiTags('document-uploads')
@ApiBearerAuth()
@Controller({ path: 'document-uploads', version: '1' })
export class DocumentUploadsController {
  constructor(private readonly documentUploadsService: DocumentUploadsService) {}

  @Get()
  @ApiOperation({ summary: 'List document uploads' })
  @ApiOkResponse({ description: 'Document uploads retrieved' })
  findAll(@Query() query: DocumentUploadQueryDto, @CurrentUser() user: AuthenticatedUser) {
    if (user.role === ROLE.CLIENT) {
      return this.documentUploadsService.listForUser(user.id, query);
    }

    return this.documentUploadsService.findAll(query);
  }

  @Get('my-documents')
  @ApiOperation({ summary: 'Get uploaded documents for the authenticated user' })
  @ApiOkResponse({ description: 'User documents retrieved' })
  getMyDocuments(@Query() query: DocumentUploadQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.documentUploadsService.listForUser(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document upload by ID' })
  @ApiOkResponse({ description: 'Document upload retrieved' })
  findOne(@Param() params: ResourceIdParamDto, @CurrentUser() user: AuthenticatedUser) {
    if (user.role === ROLE.CLIENT) {
      return this.documentUploadsService.findOneForUser(params.id, user.id);
    }

    return this.documentUploadsService.findOne(params.id);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a document for a specific service' })
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({ description: 'Document uploaded successfully' })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadDocument(
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.documentUploadsService.createUploadForUser(user.id, {
      serviceId: dto.serviceId,
      file,
      appointmentId: dto.appointmentId,
      templateId: dto.templateId,
      templateVersionId: dto.templateVersionId,
    });
  }

  @Post()
  @Roles(ROLE.ADMIN, ROLE.SPECIALIST)
  @ApiOperation({ summary: 'Create a document upload record (admin/specialist only)' })
  @ApiCreatedResponse({ description: 'Document upload created' })
  create(@Body() createDto: CreateDocumentUploadDto) {
    return this.documentUploadsService.create(createDto);
  }

  @Patch(':id')
  @Roles(ROLE.ADMIN, ROLE.SPECIALIST)
  @ApiOperation({ summary: 'Update a document upload (admin/specialist only)' })
  @ApiOkResponse({ description: 'Document upload updated' })
  update(@Param() params: ResourceIdParamDto, @Body() updateDto: UpdateDocumentUploadDto) {
    return this.documentUploadsService.update(params.id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a document upload' })
  @ApiNoContentResponse({ description: 'Document upload deleted' })
  async remove(@Param() params: ResourceIdParamDto, @CurrentUser() user: AuthenticatedUser) {
    if (user.role === ROLE.CLIENT) {
      await this.documentUploadsService.removeForUser(params.id, user.id);
    } else {
      await this.documentUploadsService.remove(params.id);
    }
  }
}
