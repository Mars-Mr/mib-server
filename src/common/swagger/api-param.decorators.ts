import { ApiParam } from '@nestjs/swagger';

export const API_UUID_EXAMPLE = '550e8400-e29b-41d4-a716-446655440000';

/** 路径参数：UUID 主键 */
export const ApiUuidParam = (name: string, description: string) =>
  ApiParam({ name, description, example: API_UUID_EXAMPLE, schema: { type: 'string', format: 'uuid' } });
