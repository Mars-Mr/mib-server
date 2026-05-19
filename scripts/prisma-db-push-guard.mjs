#!/usr/bin/env node
/**
 * Wrapper around `prisma db push` — forbidden when NODE_ENV=production.
 */
import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env') });

const nodeEnv = process.env.NODE_ENV ?? 'development';

if (nodeEnv === 'production') {
  console.error(
    [
      'ERROR: `prisma db push` is forbidden when NODE_ENV=production.',
      'Production must use versioned migrations:',
      '  yarn prisma:migrate:deploy:safe   # backup + migrate deploy',
      '  yarn prisma:migrate:deploy',
    ].join('\n'),
  );
  process.exit(1);
}

console.warn(
  'WARN: `db push` is for local prototyping only. Prefer `yarn prisma:migrate:dev` to create migrations.\n',
);

const result = spawnSync('npx', ['prisma', 'db', 'push', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
