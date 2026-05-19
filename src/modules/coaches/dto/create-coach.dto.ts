import { IsOptional, IsString } from 'class-validator';

export class CreateCoachDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
