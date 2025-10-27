import { PartialType } from '@nestjs/swagger';

import { CreateDocumentUploadDto } from './create-document-upload.dto';

export class UpdateDocumentUploadDto extends PartialType(CreateDocumentUploadDto) {}
