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

import { CreateDocumentUploadDto } from './dto/create-document-upload.dto';
import { UpdateDocumentUploadDto } from './dto/update-document-upload.dto';
import { DocumentUploadsService } from './document-uploads.service';

@ApiTags('document-uploads')
@Controller({ path: 'document-uploads', version: '1' })
export class DocumentUploadsController {
  constructor(private readonly documentUploadsService: DocumentUploadsService) {}

  @Get()
  @ApiOperation({ summary: 'List document uploads' })
  @ApiOkResponse({ description: 'Document uploads retrieved' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.documentUploadsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document upload' })
  @ApiOkResponse({ description: 'Document upload retrieved' })
  findOne(@Param() params: ResourceIdParamDto) {
    return this.documentUploadsService.findOne(params.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a document upload' })
  @ApiCreatedResponse({ description: 'Document upload created' })
  create(@Body() createDto: CreateDocumentUploadDto) {
    return this.documentUploadsService.create(createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a document upload' })
  @ApiOkResponse({ description: 'Document upload updated' })
  update(@Param() params: ResourceIdParamDto, @Body() updateDto: UpdateDocumentUploadDto) {
    return this.documentUploadsService.update(params.id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a document upload' })
  @ApiNoContentResponse({ description: 'Document upload deleted' })
  async remove(@Param() params: ResourceIdParamDto) {
    await this.documentUploadsService.remove(params.id);
  }
}
