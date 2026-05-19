export type RunWithBusinessLockOptions = {
  /**
   * Max duration for `fn`. Must be less than `ttlSeconds` unless `renewIntervalMs` is set.
   * Defaults to `(ttlSeconds - 1) * 1000`.
   */
  operationTimeoutMs?: number;
  /**
   * Renew lock TTL while `fn` runs (for tasks that may exceed `ttlSeconds`).
   * Interval is capped to half of `ttlSeconds`.
   */
  renewIntervalMs?: number;
  /** Called when lock is not acquired; default throws BusinessLockBusyError. */
  onBusy?: () => never | Promise<never>;
};
