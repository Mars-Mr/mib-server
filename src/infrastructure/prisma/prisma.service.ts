import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { ENV_CONFIG } from '../../common/config/env-config.token';
import type { EnvConfig } from '../../common/config/env.types';
import { WinstonLoggersService } from '../../common/logger/winston-loggers.service';
import { prismaTenantExtension } from './tenant/prisma-tenant.extension';

export type ExtendedPrismaClient = ReturnType<typeof createExtendedPrismaClient>;

function createExtendedPrismaClient(base: PrismaClient) {
  return base.$extends(prismaTenantExtension);
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logQueries: boolean;

  constructor(
    private readonly winston: WinstonLoggersService,
    @Inject(ENV_CONFIG) env: EnvConfig,
  ) {
    const log: Prisma.LogDefinition[] = [
      { emit: 'stdout', level: 'warn' },
      { emit: 'stdout', level: 'error' },
    ];
    if (env.PRISMA_LOG_QUERIES) {
      log.push({ emit: 'event', level: 'query' });
    }
    super({ log });
    this.logQueries = env.PRISMA_LOG_QUERIES;

    const extended = createExtendedPrismaClient(this);
    return extended as unknown as PrismaService;
  }

  async onModuleInit() {
    if (this.logQueries) {
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
