## Summary

<!-- What does this PR change? -->

## Database migrations

<!-- If this PR touches prisma/schema.prisma or prisma/migrations/, complete the checklist. -->

- [ ] I used `yarn prisma:migrate:dev` (not `db push`) for schema changes
- [ ] I ran `yarn prisma:migrate:review --strict --git` locally
- [ ] Risky migrations (drop/alter unique) have `prisma/migrations/<name>/.reviewed` after review
- [ ] Production deploy plan: backup → `yarn prisma:migrate:deploy:safe`

## Test plan

- [ ] `yarn prisma:validate`
- [ ] `yarn test` / `yarn test:e2e`
