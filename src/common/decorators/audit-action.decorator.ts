import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'auditAction';

/** High-signal audit trail (who did what on which request). Logged to the `audit` channel. */
export const AuditAction = (description: string) => SetMetadata(AUDIT_ACTION_KEY, description);
