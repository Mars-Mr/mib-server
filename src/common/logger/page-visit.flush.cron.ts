import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PageVisitAccumulatorService } from './page-visit.accumulator';
import { WinstonLoggersService } from './winston-loggers.service';

@Injectable()
export class PageVisitFlushCron {
  constructor(
    private readonly winston: WinstonLoggersService,
    private readonly pageVisits: PageVisitAccumulatorService,
  ) {}

  @Cron(process.env.PAGE_VISIT_FLUSH_CRON ?? CronExpression.EVERY_5_MINUTES)
  flushSnapshot() {
    const routes = this.pageVisits.peek();
    if (Object.keys(routes).length === 0) return;
    this.winston.logPageVisitSnapshot({
      type: 'page_visit_counts',
      routes,
      recordedAt: new Date().toISOString(),
    });
  }
}
