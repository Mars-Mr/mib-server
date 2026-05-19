import { Prisma } from '@prisma/client';
import { TENANT_SCOPED_MODELS } from './tenant-scoped.models';
import {
  isTenantBypass,
  resolveTenantIdForWrite,
  resolveTenantWhere,
  type TenantWhereClause,
} from './tenant-context';

const READ_OPS = new Set([
  'findMany',
  'findFirst',
  'findUnique',
  'count',
  'aggregate',
  'groupBy',
]);

const WRITE_FILTER_OPS = new Set(['update', 'delete', 'updateMany', 'deleteMany']);

const CREATE_OPS = new Set(['create', 'createMany', 'upsert']);

function modelKey(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

function mergeWhere(
  where: Record<string, unknown> | undefined,
  tenant: TenantWhereClause,
): Record<string, unknown> {
  if (!where || Object.keys(where).length === 0) return tenant;
  return { AND: [where, tenant] };
}

function injectTenantIntoData(
  data: Record<string, unknown> | Record<string, unknown>[],
  tenantId: string,
): Record<string, unknown> | Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.map(row => ({ ...row, tenantId: row.tenantId ?? tenantId }));
  }
  return { ...data, tenantId: data.tenantId ?? tenantId };
}

export const prismaTenantExtension = Prisma.defineExtension(client => {
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const tenantWhere = resolveTenantWhere();
          if (!tenantWhere) {
            return query(args);
          }

          const a = args as {
            where?: Record<string, unknown>;
            data?: Record<string, unknown> | Record<string, unknown>[];
            create?: Record<string, unknown>;
            update?: Record<string, unknown>;
            select?: unknown;
            include?: unknown;
          };

          if (READ_OPS.has(operation)) {
            a.where = mergeWhere(a.where, tenantWhere);
            if (operation === 'findUnique') {
              const delegate = (
                client as unknown as Record<string, { findFirst: (arg: unknown) => Promise<unknown> }>
              )[modelKey(model)];
              return delegate.findFirst({
                where: a.where,
                select: a.select,
                include: a.include,
              });
            }
            return query(a);
          }

          if (WRITE_FILTER_OPS.has(operation)) {
            a.where = mergeWhere(a.where, tenantWhere);
            return query(a);
          }

          if (CREATE_OPS.has(operation)) {
            const tenantId = resolveTenantIdForWrite();
            if (tenantId && !isTenantBypass()) {
              if (operation === 'create' && a.data && !Array.isArray(a.data)) {
                a.data = injectTenantIntoData(a.data, tenantId) as Record<string, unknown>;
              }
              if (operation === 'createMany' && a.data) {
                a.data = injectTenantIntoData(
                  a.data as Record<string, unknown>[],
                  tenantId,
                ) as Record<string, unknown>[];
              }
              if (operation === 'upsert') {
                a.where = mergeWhere(a.where, tenantWhere);
                if (a.create) a.create = injectTenantIntoData(a.create, tenantId) as Record<string, unknown>;
              }
            }
            return query(a);
          }

          return query(args);
        },
      },
    },
  });
});
