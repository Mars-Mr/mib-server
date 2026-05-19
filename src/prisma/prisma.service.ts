import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { WinstonLoggersService } from '../common/logger/winston-loggers.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly winston: WinstonLoggersService) {
    const log: Prisma.LogDefinition[] = [
      { emit: 'stdout', level: 'warn' },
      { emit: 'stdout', level: 'error' },
    ];
    if (process.env.PRISMA_LOG_QUERIES === '1') {
      log.push({ emit: 'event', level: 'query' });
    }
    super({ log });
  }

  async onModuleInit() {
    if (process.env.PRISMA_LOG_QUERIES === '1') {
      this.$on('query', (e: Prisma.QueryEvent) => {
        this.winston.logApplication('debug', 'prisma_query', {
          durationMs: e.duration,
          query: e.query,
          params: e.params,
        });
      });
    }
    await this.$connect();
    this.winston.logApplication('info', 'Prisma connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
