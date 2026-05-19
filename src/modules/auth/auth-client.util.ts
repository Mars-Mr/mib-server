import type { Request } from 'express';

export type LoginClientContext = {
  ip: string;
  userAgent?: string;
  deviceHint: string;
};

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0]?.trim() || 'unknown';
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

export function parseDeviceHint(userAgent?: string): string {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';
  if (ua.includes('android')) return 'android';
  if (ua.includes('mobile')) return 'mobile';
  if (ua.includes('windows')) return 'windows';
  if (ua.includes('mac os') || ua.includes('macintosh')) return 'macos';
  if (ua.includes('linux')) return 'linux';
  return 'desktop';
}

export function buildLoginClientContext(req: Request): LoginClientContext {
  const userAgent = req.headers['user-agent'];
  return {
    ip: getClientIp(req),
    userAgent,
    deviceHint: parseDeviceHint(userAgent),
  };
}
