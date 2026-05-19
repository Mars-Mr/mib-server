import { loadEnvFile } from '../src/common/config/env.loader';
import { resetEnvConfigCache } from '../src/common/config/env.schema';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';

loadEnvFile();
resetEnvConfigCache();
