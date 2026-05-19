import { timingSafeEqual } from 'crypto';
import type { RequestHandler } from 'express';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function swaggerBasicAuthMiddleware(user: string, pass: string): RequestHandler {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="MIB API Docs"');
      res.status(401).send('Authentication required');
      return;
    }
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const sep = decoded.indexOf(':');
    const u = sep >= 0 ? decoded.slice(0, sep) : decoded;
    const p = sep >= 0 ? decoded.slice(sep + 1) : '';
    if (safeEqual(u, user) && safeEqual(p, pass)) {
      next();
      return;
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="MIB API Docs"');
    res.status(401).send('Invalid credentials');
  };
}
