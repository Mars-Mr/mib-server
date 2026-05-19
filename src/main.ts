import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppModule } from './app.module';
import { buildLogDefaultMeta } from './common/logger/winston-loggers.service';
import { setupSwagger, swaggerBaseUrl } from './swagger';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';

  const nestWinston = WinstonModule.createLogger({
    level: process.env.LOG_LEVEL ?? 'info',
    transports: [
      new winston.transports.Console(
        isProd
          ? {
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.printf(info => {
                  const { level, message, timestamp, context, ...rest } = info;
                  const meta = { ...buildLogDefaultMeta(), level, context, msg: message, ...rest };
                  return JSON.stringify({ timestamp, ...meta });
                }),
              ),
            }
          : {
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.colorize(),
                winston.format.printf(info => {
                  const { level, message, timestamp, context } = info;
                  const ts = typeof timestamp === 'string' ? timestamp : JSON.stringify(timestamp);
                  const ctx =
                    context === undefined || context === null
                      ? 'Nest'
                      : typeof context === 'string' || typeof context === 'number' || typeof context === 'boolean'
                        ? String(context)
                        : JSON.stringify(context);
                  const msg = typeof message === 'string' ? message : JSON.stringify(message);
                  return `${ts} ${ctx} ${level}: ${msg}`;
                }),
              ),
            },
      ),
    ],
  });

  const app = await NestFactory.create(AppModule, { logger: nestWinston });
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const swaggerPaths = setupSwagger(app);

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  const base = swaggerBaseUrl(port);
  nestWinston.log('info', `Listening on ${base}`);
  if (swaggerPaths) {
    nestWinston.log('info', `Swagger UI: ${base}${swaggerPaths.uiPath}`);
    nestWinston.log('info', `OpenAPI JSON: ${base}${swaggerPaths.jsonPath}`);
    nestWinston.log('info', `OpenAPI YAML: ${base}${swaggerPaths.yamlPath}`);
  }
}
bootstrap();
