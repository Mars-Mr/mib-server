import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsString()
  title: string;

  @IsNumber()
  amount: number;
}
