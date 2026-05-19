import { IsString } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsString()
  studentId: string;

  @IsString()
  scheduleId: string;
}
