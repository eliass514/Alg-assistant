import { Transform } from 'class-transformer';
import {
  IsLocale,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @Transform(({ value }) => value?.trim())
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName?: string;

  @Transform(({ value }) => value?.trim())
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName?: string;

  @Transform(({ value }) => value?.trim())
  @IsOptional()
  @IsPhoneNumber('ZZ')
  phoneNumber?: string;

  @Transform(({ value }) => value?.trim())
  @IsOptional()
  @IsLocale()
  locale?: string;
}
