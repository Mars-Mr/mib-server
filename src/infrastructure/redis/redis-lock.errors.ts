/** Redis lock could not be acquired (another holder or expired race). Not a correctness failure — retry or surface 409. */
export class BusinessLockBusyError extends Error {
  readonly name = 'BusinessLockBusyError';

  constructor(public readonly resource: string) {
    super(`Redis lock busy: ${resource}`);
  }
}

/** Business fn exceeded operationTimeoutMs; lock is released in finally — DB constraints still apply. */
export class LockOperationTimeoutError extends Error {
  readonly name = 'LockOperationTimeoutError';

  constructor(
    public readonly resource: string,
    public readonly timeoutMs: number,
  ) {
    super(`Lock holder timed out after ${timeoutMs}ms: ${resource}`);
  }
}
