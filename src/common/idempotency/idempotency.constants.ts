export const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';

export const IDEMPOTENCY_KEY_MIN_LENGTH = 8;
export const IDEMPOTENCY_KEY_MAX_LENGTH = 128;

/** Cached successful response TTL (seconds). */
export const IDEMPOTENCY_RESULT_TTL_SECONDS = 86_400;

/** In-flight request marker TTL (seconds). */
export const IDEMPOTENCY_PROCESSING_TTL_SECONDS = 120;

/** Max wait when another request holds PROCESSING (ms). */
export const IDEMPOTENCY_PROCESSING_WAIT_MS = 6_000;

export const IDEMPOTENCY_PROCESSING_POLL_MS = 200;

export const IDEMPOTENT_METADATA_KEY = 'idempotent';
