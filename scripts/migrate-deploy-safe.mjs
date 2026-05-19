#!/usr/bin/env node
/**
 * Production-safe migration: MySQL backup → prisma migrate deploy.
 * Requires NODE_ENV=production (or MIGRATE_DEPLOY_FORCE=1).
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, resolve } from 'node:path';
import { config } from 'dotenv';
import { parseDatabaseUrl } from './lib/parse-database-url.mjs';

config({ path: resolve(process.cwd(), '.env') });

const nodeEnv = process.env.NODE_ENV ?? 'development';
const force = process.env.MIGRATE_DEPLOY_FORCE === '1';

if (nodeEnv !== 'production' && !force) {
  console.error(
    [
      'Refusing deploy: NODE_ENV is not production.',
      'For local/CI use: yarn prisma:migrate:deploy',
      'To override: MIGRATE_DEPLOY_FORCE=1 yarn prisma:migrate:deploy:safe',
    ].join('\n'),
  );
  process.exit(1);
}

if (process.env.SKIP_DB_BACKUP === '1') {
  console.warn('WARN: SKIP_DB_BACKUP=1 — skipping backup.\n');
} else {
  runBackup();
}

console.log('\nApplying migrations (prisma migrate deploy)...\n');
const deploy = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(deploy.status ?? 1);

function runBackup() {
  const backupDir = process.env.BACKUP_DIR ?? join(process.cwd(), 'backups');
  mkdirSync(backupDir, { recursive: true });

  const db = parseDatabaseUrl(process.env.DATABASE_URL);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_');
  const outFile = join(backupDir, `${db.database}_${stamp}.sql.gz`);

  console.log(`Backing up ${db.database} @ ${db.host}:${db.port} → ${outFile}`);

  const dump = spawnSync(
    'mysqldump',
    [
      '-h',
      db.host,
      '-P',
      db.port,
      '-u',
      db.user,
      `-p${db.password}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      db.database,
    ],
    { encoding: 'buffer' },
  );

  if (dump.status !== 0) {
    console.error(dump.stderr?.toString() ?? 'mysqldump failed');
    console.error(
      '\nInstall mysqldump client or run scripts/backup-mysql.sh manually, then:',
      'SKIP_DB_BACKUP=1 yarn prisma:migrate:deploy:safe',
    );
    process.exit(1);
  }

  writeFileSync(outFile, gzipSync(dump.stdout));
  console.log(`Backup written: ${outFile}`);
}
