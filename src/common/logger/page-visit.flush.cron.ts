import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ENV_CONFIG } from '../config/env-config.token';
import type { EnvConfig } from '../config/env.types';
import { getEnvConfig } from '../config/env.loader';
import { PageVisitAccumulatorService } from './page-visit.accumulator';
import { WinstonLoggersService } from './winston-loggers.service';

function resolvePageVisitCron(): string {
  try {
    return getEnvConfig().PAGE_VISIT_FLUSH_CRON;
  } catch {
    return CronExpression.EVERY_5_MINUTES;
  }
}

const PAGE_VISIT_FLUSH_CRON = resolvePageVisitCron();

@Injectable()
export class PageVisitFlushCron {
  constructor(
    private readonly winston: WinstonLoggersService,
    private readonly pageVisits: PageVisitAccumulatorService,
    @Inject(ENV_CONFIG) private readonly env: EnvConfig,
  ) {}

  @Cron(PAGE_VISIT_FLUSH_CRON)
  flushSnapshot() {
    const routes = this.pageVisits.peek();
    if (Object.keys(routes).length === 0) return;
    this.winston.logPageVisitSnapshot({
      type: 'page_visit_counts',
      routes,
      recordedAt: new Date().toISOString(),
      env: this.env.NODE_ENV,
    });
  }
}
