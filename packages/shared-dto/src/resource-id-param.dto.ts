import { IsUUID } from 'class-validator';

export class ResourceIdParamDto {
  @IsUUID('4')
  id!: string;
}
