import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { API_UUID_EXAMPLE } from '../../../common/swagger/api-param.decorators';

export class LinkTagDto {
  @ApiProperty({ description: '标签 ID', example: API_UUID_EXAMPLE })
  @IsString()
  tagId: string;
}

export class LinkGroupDto {
  @ApiProperty({ description: '分组 ID', example: API_UUID_EXAMPLE })
  @IsString()
  groupId: string;
}

export class CreateTagDto {
  @ApiProperty({ description: '标签名称', example: 'VIP' })
  @IsString()
  name: string;
}

export class CreateGroupDto {
  @ApiProperty({ description: '分组名称', example: '周末班' })
  @IsString()
  name: string;
}
