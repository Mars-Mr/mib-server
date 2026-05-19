import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiPublicErrorResponses } from '../swagger/api-response.decorators';
import { HealthResponseDto } from '../swagger/dto/responses.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: '健康检查', description: '无需鉴权；用于负载均衡探活。' })
  @ApiOkResponse({ description: '服务正常', type: HealthResponseDto })
  @ApiPublicErrorResponses()
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
