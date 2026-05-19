import { IsString } from 'class-validator';

export class CheckOutDto {
  @IsString()
  studentId: string;

  @IsString()
  scheduleId: string;
}
