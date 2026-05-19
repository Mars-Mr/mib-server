import { AsyncLocalStorage } from 'async_hooks';
import type { AccessContext } from './data-scope.types';

export const accessContextStorage = new AsyncLocalStorage<AccessContext>();

export function getAccessContext(): AccessContext | undefined {
  return accessContextStorage.getStore();
}
