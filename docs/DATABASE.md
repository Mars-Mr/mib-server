# Database

Schema: `prisma/schema.prisma`. Full migration workflow: **[prisma/MIGRATIONS.md](../prisma/MIGRATIONS.md)**.

## Quick reference

```bash
# Development — after editing schema.prisma
yarn prisma:migrate:dev --name your_change_name

# CI / staging
yarn prisma:migrate:deploy

# Production (backup first)
NODE_ENV=production yarn prisma:migrate:deploy:safe
```

Never run `yarn prisma:db:push` when `NODE_ENV=production`.
