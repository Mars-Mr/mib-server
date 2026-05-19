import { Global, Module } from '@nestjs/common';

/** 异步任务队列（BullMQ 等）预留模块 */
@Global()
@Module({})
export class QueueModule {}
