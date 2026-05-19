export type IdempotencyStoredRecord =
  | { phase: 'processing'; startedAt: number }
  | { phase: 'completed'; statusCode: number; body: unknown; completedAt: number };

export type BeginRequestIdempotencyResult =
  | { action: 'proceed' }
  | { action: 'replay'; statusCode: number; body: unknown }
  | { action: 'in_progress' };

export type IdempotentOptions = {
  /** Business scope, e.g. order:create */
  scope: string;
  /** Require Idempotency-Key header (default true). */
  required?: boolean;
  /** TTL for cached successful responses (seconds). */
  resultTtlSeconds?: number;
  /** TTL for in-flight PROCESSING marker (seconds). */
  processingTtlSeconds?: number;
  /** Max wait for in-flight peer request (ms). */
  waitForProcessingMs?: number;
  /**
   * When header is absent and required=false, build key from body fields (dot paths).
   * Example: ['orderNo', 'provider', 'providerTradeNo', 'event']
   */
  bodyKeyFields?: string[];
};
