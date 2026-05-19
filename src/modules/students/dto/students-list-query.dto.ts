import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/swagger/api-pagination.dto';

/** GET /students 查询参数 */
export class StudentsListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: '预留：按姓名模糊搜索（当前未启用）',
    example: '张',
  })
  keyword?: string;
}
