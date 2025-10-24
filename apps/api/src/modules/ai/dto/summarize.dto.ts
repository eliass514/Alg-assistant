import { IsString, MinLength } from 'class-validator';

export class SummarizeDto {
  @IsString()
  @MinLength(3)
  prompt!: string;
}
