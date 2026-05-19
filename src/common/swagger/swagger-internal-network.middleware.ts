import type { RequestHandler } from 'express';

/** Normalize Express `req.ip` / socket address for private-range checks. */
export function normalizeClientIp(ip: string | undefined): string {
  if (!ip) return '';
  return ip.replace(/^::ffff:/, '').trim();
}

/** RFC1918, loopback, and link-local (typical LAN / Docker / k8s pod networks). */
export function isPrivateOrLoopbackIp(ip: string): boolean {
  const n = normalizeClientIp(ip);
  if (!n) return false;
  if (n === '127.0.0.1' || n === '::1' || n === 'localhost') return true;
  if (n.startsWith('10.')) return true;
  if (n.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(n)) return true;
  if (n.startsWith('169.254.')) return true;
  return false;
}

/** Reject requests from the public internet; use behind VPN or cluster internal LB only. */
export function swaggerInternalNetworkMiddleware(): RequestHandler {
  return (req, res, next) => {
    const ip = req.ip ?? req.socket.remoteAddress;
    if (isPrivateOrLoopbackIp(ip ?? '')) {
      next();
      return;
    }
    res.status(403).type('text/plain').send('API documentation is not available from this network');
  };
}
