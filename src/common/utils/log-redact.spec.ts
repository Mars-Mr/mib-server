import { describe, expect, it } from '@jest/globals';
import { redactForLog } from './log-redact';

describe('redactForLog', () => {
  it('removes secrets and masks phone numbers', () => {
    const input = {
      username: 'alice',
      password: 'secret',
      phone: '13800138000',
      nested: { emergencyPhone: '13900139000' },
    };
    expect(redactForLog(input)).toEqual({
      username: 'alice',
      phone: '138****8000',
      nested: { emergencyPhone: '139****9000' },
    });
  });
});
