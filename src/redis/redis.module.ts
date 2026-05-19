import { Global, Module } from '@nestjs/common';
import { RedisBusinessService } from './redis-business.service';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService, RedisBusinessService],
  exports: [RedisService, RedisBusinessService],
})
export class RedisModule {}
