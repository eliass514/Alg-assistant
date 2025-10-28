import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Express, Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';

import { Public } from '@common/decorators/public.decorator';

import { DocumentVerificationService } from './document-verification.service';
import { DocumentVerificationLogDto } from './dto/document-verification-log.dto';
import { DocumentVerificationResponseDto } from './dto/document-verification-response.dto';
import { ReviewDocumentDto } from './dto/review-document.dto';
import { UploadDocumentVerificationDto } from './dto/upload-document-verification.dto';

@ApiTags('document-verification')
@Controller({ path: 'document-verification', version: '1' })
export class DocumentVerificationController {
  constructor(private readonly documentVerificationService: DocumentVerificationService) {}

  @Post('upload')
  @Public()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiOperation({ summary: 'Upload a document for automated verification' })
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({
    description: 'Document queued and processed',
    type: DocumentVerificationResponseDto,
  })
  uploadDocument(
    @Body() dto: UploadDocumentVerificationDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() request: Request,
  ): DocumentVerificationResponseDto {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const metadata = this.parseMetadata(dto.metadata);
    const rateLimitKey = this.resolveRateLimitKey(request, dto.referenceId);

    return this.documentVerificationService.uploadDocument(
      rateLimitKey,
      dto.docType,
      metadata,
      file,
    );
  }

  @Get(':id/status')
  @Public()
  @ApiOperation({ summary: 'Retrieve the current status of a verification request' })
  @ApiOkResponse({
    description: 'Verification status retrieved',
    type: DocumentVerificationResponseDto,
  })
  getStatus(@Param('id') id: string): DocumentVerificationResponseDto {
    return this.documentVerificationService.getStatus(id);
  }

  @Get(':id/logs')
  @Public()
  @ApiOperation({ summary: 'Retrieve detailed verification logs for a document' })
  @ApiOkResponse({
    description: 'Verification logs retrieved',
    type: DocumentVerificationLogDto,
    isArray: true,
  })
  getLogs(@Param('id') id: string): DocumentVerificationLogDto[] {
    return this.documentVerificationService.getLogs(id);
  }

  @Post(':id/review')
  @Public()
  @ApiOperation({ summary: 'Submit a manual review decision for a verification request' })
  @ApiOkResponse({
    description: 'Manual review decision applied',
    type: DocumentVerificationResponseDto,
  })
  submitReview(
    @Param('id') id: string,
    @Body() dto: ReviewDocumentDto,
  ): DocumentVerificationResponseDto {
    return this.documentVerificationService.submitReview(id, dto.decision, dto.reviewer, dto.notes);
  }

  private parseMetadata(metadata: string): Record<string, unknown> {
    if (!metadata) {
      return {};
    }

    try {
      const parsed = JSON.parse(metadata);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Metadata must be a JSON object');
      }

      return parsed as Record<string, unknown>;
    } catch (error) {
      throw new BadRequestException('Metadata must be a valid JSON object');
    }
  }

  private resolveRateLimitKey(request: Request, referenceId?: string): string {
    const headerKey = request.headers['x-api-key'];
    if (typeof headerKey === 'string' && headerKey.trim().length > 0) {
      return headerKey.trim();
    }

    if (Array.isArray(headerKey) && headerKey.length > 0) {
      return headerKey[0];
    }

    if (referenceId && referenceId.trim().length > 0) {
      return referenceId.trim();
    }

    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      const [first] = forwarded.split(',').map((item) => item.trim());
      if (first) {
        return first;
      }
    }

    return request.ip ?? 'anonymous';
  }
}
