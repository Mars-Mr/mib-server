import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ENV_CONFIG } from './env-config.token';
import { getEnvConfig, loadEnvFile } from './env.loader';
import { validateEnvConfig } from './env.schema';

loadEnvFile();

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      cache: true,
      validate: config => validateEnvConfig(config as Record<string, unknown>),
    }),
  ],
  providers: [
    {
      provide: ENV_CONFIG,
      useFactory: () => getEnvConfig(),
    },
  ],
  exports: [ENV_CONFIG],
})
export class AppConfigModule {}
