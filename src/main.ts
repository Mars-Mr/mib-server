import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppModule } from './app.module';
import { getEnvConfig, loadEnvFile } from './common/config/env.loader';
import { buildLogDefaultMeta } from './common/logger/winston-loggers.service';
import { setupSwagger, swaggerBaseUrl } from './swagger';

async function bootstrap() {
  loadEnvFile();
  const env = getEnvConfig();
  const isProd = env.NODE_ENV === 'production';

  const nestWinston = WinstonModule.createLogger({
    level: env.LOG_LEVEL,
    transports: [
      new winston.transports.Console(
        isProd
          ? {
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.printf(info => {
                  const { level, message, timestamp, context, ...rest } = info;
                  const meta = { ...buildLogDefaultMeta(env), level, context, msg: message, ...rest };
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

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: nestWinston });
  if (isProd) {
    app.set('trust proxy', 1);
  }
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const swaggerPaths = setupSwagger(app, env);

  await app.listen(env.PORT);
  const base = swaggerBaseUrl(env.PORT, env.SWAGGER_HOST);
  nestWinston.log('info', `Listening on ${base}`);
  if (swaggerPaths) {
    nestWinston.log('info', `Swagger UI: ${base}${swaggerPaths.uiPath}`);
    nestWinston.log('info', `OpenAPI JSON: ${base}${swaggerPaths.jsonPath}`);
    nestWinston.log('info', `OpenAPI YAML: ${base}${swaggerPaths.yamlPath}`);
  }
}
bootstrap();
