import { PartialType } from '@nestjs/swagger';

import { AdminCreateDocumentTemplateDto } from './admin-create-document-template.dto';

export class AdminUpdateDocumentTemplateDto extends PartialType(AdminCreateDocumentTemplateDto) {}
