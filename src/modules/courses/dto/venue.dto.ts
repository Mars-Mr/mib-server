import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateVenueDto {
  @ApiProperty({ description: '场地名称', example: 'A 馆 1 号教室' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '地址', example: '上海市浦东新区 XX 路 1 号' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: '纬度', example: 31.2304 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: '经度', example: 121.4737 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: '地理围栏半径（米）', example: 100 })
  @IsOptional()
  @IsNumber()
  geofenceRadiusM?: number;
}
