import { AsyncLocalStorage } from 'async_hooks';

const auditUserStorage = new AsyncLocalStorage<string>();

export function runWithAuditUser<T>(userId: string | undefined, fn: () => T): T {
  if (!userId) return fn();
  return auditUserStorage.run(userId, fn);
}

export function getAuditUserId(): string | undefined {
  return auditUserStorage.getStore();
}

/** Fields to set when inserting a new auditable row. */
export function auditOnCreate(): { createdBy?: string; updatedBy?: string } {
  const id = getAuditUserId();
  if (!id) return {};
  return { createdBy: id, updatedBy: id };
}

/** Fields to set on update / status change. */
export function auditOnUpdate(): { updatedBy?: string } {
  const id = getAuditUserId();
  return id ? { updatedBy: id } : {};
}

/** Fields when logically deleting or cancelling (e.g. schedule cancel). */
export function auditOnDelete(): { deletedBy?: string; updatedBy?: string } {
  const id = getAuditUserId();
  if (!id) return {};
  return { deletedBy: id, updatedBy: id };
}
