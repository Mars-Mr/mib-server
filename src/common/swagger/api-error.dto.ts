import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 与全局异常过滤器返回结构一致 */
export class ApiErrorResponseDto {
  @ApiProperty({ description: 'HTTP 状态码', example: 400 })
  statusCode: number;

  @ApiProperty({
    description: '错误说明，校验失败时为字符串数组',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: '请求参数不合法',
  })
  message: string | string[];

  @ApiPropertyOptional({ description: '错误类型简述', example: 'Bad Request' })
  error?: string;
}
