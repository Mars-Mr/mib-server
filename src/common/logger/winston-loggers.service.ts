import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ENV_CONFIG } from '../config/env-config.token';
import type { EnvConfig } from '../config/env.types';
import { PageVisitAccumulatorService } from './page-visit.accumulator';

const jsonFormat = () => winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json());

/** Shared fields for log aggregation / correlation (all channels). */
export function buildLogDefaultMeta(env: Pick<EnvConfig, 'LOG_SERVICE_NAME' | 'NODE_ENV' | 'APP_VERSION'>): Record<string, string> {
  return {
    service: env.LOG_SERVICE_NAME,
    env: env.NODE_ENV,
    version: env.APP_VERSION,
  };
}

function dailyFile(basename: string, logDir: string, env: EnvConfig): DailyRotateFile {
  return new DailyRotateFile({
    dirname: logDir,
    filename: `${basename}-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxSize: env.LOG_MAX_SIZE,
    maxFiles: env.LOG_MAX_FILES,
    zippedArchive: env.LOG_ZIP_ARCHIVE,
  });
}

@Injectable()
export class WinstonLoggersService implements OnModuleDestroy {
  readonly error: winston.Logger;
  readonly access: winston.Logger;
  readonly behavior: winston.Logger;
  readonly audit: winston.Logger;
  readonly security: winston.Logger;
  readonly pageVisit: winston.Logger;
  readonly app: winston.Logger;

  private readonly closables: winston.Logger[] = [];

  constructor(
    private readonly pageHits: PageVisitAccumulatorService,
    @Inject(ENV_CONFIG) private readonly env: EnvConfig,
  ) {
    const logDir = env.LOG_DIR;
    const isProd = env.NODE_ENV === 'production';
    const baseMeta = buildLogDefaultMeta(env);

    this.error = winston.createLogger({
      level: 'error',
      format: jsonFormat(),
      defaultMeta: { ...baseMeta, channel: 'error' },
      transports: [dailyFile('error', logDir, env)],
    });

    this.access = winston.createLogger({
      level: 'info',
      format: jsonFormat(),
      defaultMeta: { ...baseMeta, channel: 'access' },
      transports: [dailyFile('access', logDir, env)],
    });

    this.behavior = winston.createLogger({
      level: 'info',
      format: jsonFormat(),
      defaultMeta: { ...baseMeta, channel: 'behavior' },
      transports: [dailyFile('behavior', logDir, env)],
    });

    this.audit = winston.createLogger({
      level: 'info',
      format: jsonFormat(),
      defaultMeta: { ...baseMeta, channel: 'audit' },
      transports: [dailyFile('audit', logDir, env)],
    });

    this.security = winston.createLogger({
      level: 'info',
      format: jsonFormat(),
      defaultMeta: { ...baseMeta, channel: 'security' },
      transports: [dailyFile('security', logDir, env)],
    });

    this.pageVisit = winston.createLogger({
      level: 'info',
      format: jsonFormat(),
      defaultMeta: { ...baseMeta, channel: 'page_visit' },
      transports: [dailyFile('page-visit', logDir, env)],
    });

    this.app = winston.createLogger({
      level: env.LOG_LEVEL,
      format: jsonFormat(),
      defaultMeta: { ...baseMeta, channel: 'app' },
      transports: [dailyFile('app', logDir, env)],
    });

    this.closables.push(this.error, this.access, this.behavior, this.audit, this.security, this.pageVisit, this.app);

    if (!isProd) {
      const consoleFmt = winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(info => {
          const { timestamp, level, message, ...rest } = info;
          const ts = typeof timestamp === 'string' ? timestamp : JSON.stringify(timestamp);
          const msg = typeof message === 'string' ? message : JSON.stringify(message);
          const extra = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
          return `${ts} ${level}: ${msg}${extra}`;
        }),
      );
      const c = new winston.transports.Console({ format: consoleFmt });
      this.error.add(c);
      this.app.add(new winston.transports.Console({ format: consoleFmt }));
      this.security.add(new winston.transports.Console({ format: consoleFmt }));
      this.audit.add(new winston.transports.Console({ format: consoleFmt }));
    }
  }

  logHttpAccess(meta: Record<string, unknown>) {
    this.access.info('http_access', meta);
  }

  logUserBehavior(meta: Record<string, unknown>) {
    this.behavior.info('user_behavior', meta);
  }

  logAudit(meta: Record<string, unknown>) {
    this.audit.info('audit', meta);
  }

  logSecurity(meta: Record<string, unknown>) {
    this.security.info('security', meta);
  }

  logPageVisitSnapshot(meta: Record<string, unknown>) {
    this.pageVisit.info('page_visit_snapshot', meta);
  }

  logApplication(level: 'info' | 'debug' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) {
    this.app.log(level, message, meta);
  }

  logServerError(meta: Record<string, unknown>) {
    this.error.error('server_error', meta);
  }

  logClientError(meta: Record<string, unknown>) {
    this.error.warn('client_error', meta);
  }

  async onModuleDestroy() {
    const routes = this.pageHits.peek();
    if (Object.keys(routes).length > 0) {
      this.pageVisit.info('page_visit_shutdown_snapshot', {
        type: 'page_visit_counts',
        routes,
        recordedAt: new Date().toISOString(),
      });
    }
    await Promise.all(
      this.closables.map(
        l =>
          new Promise<void>(resolve => {
            l.end(() => resolve());
          }),
      ),
    );
  }
}
