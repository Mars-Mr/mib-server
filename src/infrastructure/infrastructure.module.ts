import { Global, Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';

@Global()
@Module({
  imports: [PrismaModule, RedisModule, QueueModule, StorageModule],
  exports: [PrismaModule, RedisModule, QueueModule, StorageModule],
})
export class InfrastructureModule {}
