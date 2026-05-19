import { Global, Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AccessBehaviorInterceptor } from '../interceptors/access-behavior.interceptor';
import { PageVisitAccumulatorService } from './page-visit.accumulator';
import { PageVisitFlushCron } from './page-visit.flush.cron';
import { RequestIdMiddleware } from './request-id.middleware';
import { WinstonLoggersService } from './winston-loggers.service';

@Global()
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [PageVisitAccumulatorService, WinstonLoggersService, PageVisitFlushCron, { provide: APP_INTERCEPTOR, useClass: AccessBehaviorInterceptor }],
  exports: [WinstonLoggersService, PageVisitAccumulatorService],
})
export class LoggingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
