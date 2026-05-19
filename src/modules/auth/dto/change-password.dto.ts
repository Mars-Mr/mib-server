import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: '当前密码', format: 'password' })
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @ApiProperty({ description: '新密码（至少 6 位）', format: 'password', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
