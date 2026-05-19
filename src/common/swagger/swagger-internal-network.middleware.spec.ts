import { describe, expect, it } from '@jest/globals';
import { isPrivateOrLoopbackIp, normalizeClientIp } from './swagger-internal-network.middleware';

describe('swagger internal network', () => {
  it('normalizes IPv4-mapped IPv6', () => {
    expect(normalizeClientIp('::ffff:192.168.1.10')).toBe('192.168.1.10');
  });

  it('allows private and loopback ranges', () => {
    expect(isPrivateOrLoopbackIp('127.0.0.1')).toBe(true);
    expect(isPrivateOrLoopbackIp('10.0.0.5')).toBe(true);
    expect(isPrivateOrLoopbackIp('192.168.0.1')).toBe(true);
    expect(isPrivateOrLoopbackIp('172.16.0.1')).toBe(true);
    expect(isPrivateOrLoopbackIp('::ffff:10.1.2.3')).toBe(true);
  });

  it('rejects public IPs', () => {
    expect(isPrivateOrLoopbackIp('8.8.8.8')).toBe(false);
    expect(isPrivateOrLoopbackIp('203.0.113.1')).toBe(false);
  });
});
