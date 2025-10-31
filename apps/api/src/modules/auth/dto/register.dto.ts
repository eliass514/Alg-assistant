import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsLocale,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const PASSWORD_COMPLEXITY_MESSAGE =
  'Password must contain uppercase, lowercase, number, and special character with minimum length of 8 characters';

export class RegisterDto {
  @Transform(({ value }) => value?.trim())
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName!: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName!: string;

  @Transform(({ value }) => value?.trim())
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @Transform(({ value }) => value?.trim())
  @IsOptional()
  @IsLocale()
  locale?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=]).+$/, {
    message: PASSWORD_COMPLEXITY_MESSAGE,
  })
  password!: string;
}
