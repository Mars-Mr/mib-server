#!/usr/bin/env node
/**
 * Scan Prisma migration SQL for risky operations.
 * Usage:
 *   node scripts/review-migrations.mjs           # report all migrations
 *   node scripts/review-migrations.mjs --strict    # exit 1 if unacknowledged risks
 *   node scripts/review-migrations.mjs --git       # only migrations changed vs origin/main
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const MIGRATIONS_DIR = join(process.cwd(), 'prisma', 'migrations');
const REVIEW_MARKER = '.reviewed';

const RULES = [
  { level: 'critical', label: 'DROP TABLE', pattern: /\bDROP\s+TABLE\b/i },
  { level: 'critical', label: 'TRUNCATE', pattern: /\bTRUNCATE\b/i },
  { level: 'critical', label: 'DROP COLUMN', pattern: /\bDROP\s+COLUMN\b/i },
  { level: 'critical', label: 'ALTER TABLE … DROP', pattern: /\bALTER\s+TABLE\b[\s\S]*?\bDROP\b/i },
  { level: 'high', label: 'ALTER … MODIFY (type change risk)', pattern: /\bALTER\s+TABLE\b[\s\S]*?\bMODIFY\b/i },
  { level: 'high', label: 'ALTER … CHANGE (rename/type risk)', pattern: /\bALTER\s+TABLE\b[\s\S]*?\bCHANGE\b/i },
  { level: 'high', label: 'CREATE UNIQUE INDEX', pattern: /\bCREATE\s+UNIQUE\s+INDEX\b/i },
  { level: 'high', label: 'ADD UNIQUE constraint', pattern: /\bADD\s+CONSTRAINT\b[\s\S]*\bUNIQUE\b/i },
  { level: 'medium', label: 'DELETE FROM', pattern: /\bDELETE\s+FROM\b/i },
  { level: 'medium', label: 'RENAME TABLE', pattern: /\bRENAME\s+TABLE\b/i },
];

function listMigrationDirs() {
  if (!existsSync(MIGRATIONS_DIR)) return [];
  return readdirSync(MIGRATIONS_DIR)
    .filter(name => {
      const full = join(MIGRATIONS_DIR, name);
      return statSync(full).isDirectory() && existsSync(join(full, 'migration.sql'));
    })
    .sort();
}

function gitChangedMigrationDirs() {
  const base = process.env.MIGRATION_REVIEW_BASE ?? 'origin/main';
  const result = spawnSync('git', ['diff', '--name-only', `${base}...HEAD`, '--', 'prisma/migrations'], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    console.warn(`WARN: could not diff against ${base}, reviewing all migrations.`);
    return null;
  }
  const dirs = new Set();
  for (const line of result.stdout.split('\n')) {
    const m = line.match(/^prisma\/migrations\/([^/]+)\//);
    if (m) dirs.add(m[1]);
  }
  return dirs.size > 0 ? dirs : new Set();
}

function scanSql(sql, file) {
  const findings = [];
  for (const rule of RULES) {
    if (rule.pattern.test(sql)) {
      findings.push({ ...rule, file });
    }
  }
  return findings;
}

function isAcknowledged(migrationDir) {
  return existsSync(join(MIGRATIONS_DIR, migrationDir, REVIEW_MARKER));
}

function main() {
  const strict = process.argv.includes('--strict');
  const gitOnly = process.argv.includes('--git');

  let dirs = listMigrationDirs();
  if (gitOnly) {
    const changed = gitChangedMigrationDirs();
    if (changed) {
      dirs = dirs.filter(d => changed.has(d));
    }
  }

  if (dirs.length === 0) {
    console.log('No migrations to review.');
    process.exit(0);
  }

  let hasRisk = false;
  let hasUnacknowledged = false;

  console.log('Prisma migration review\n');

  for (const dir of dirs) {
    const sqlPath = join(MIGRATIONS_DIR, dir, 'migration.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    const findings = scanSql(sql, relative(process.cwd(), sqlPath));
    const ack = isAcknowledged(dir);

    if (findings.length === 0) {
      console.log(`✓ ${dir} — no flagged patterns`);
      continue;
    }

    hasRisk = true;
    const ackLabel = ack ? 'acknowledged' : 'NEEDS REVIEW';
    if (!ack) hasUnacknowledged = true;
    console.log(`\n${ack ? '△' : '✗'} ${dir} [${ackLabel}]`);
    for (const f of findings) {
      console.log(`    [${f.level}] ${f.label}`);
    }
    if (!ack) {
      console.log(`    → After DBA/lead review, add: prisma/migrations/${dir}/${REVIEW_MARKER}`);
    }
  }

  console.log('\n---');
  console.log('See prisma/MIGRATIONS.md#migration-review for the checklist.');

  if (strict && hasUnacknowledged) {
    console.error('\nFAILED: unacknowledged risky migration(s). Add .reviewed or fix SQL.');
    process.exit(1);
  }
  if (strict && !hasRisk) {
    console.log('\nOK: no risky patterns in scope.');
  }
  process.exit(0);
}

main();
