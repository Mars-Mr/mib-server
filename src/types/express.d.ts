declare global {
  namespace Express {
    interface Request {
      /** Correlation / request id (also echoed as `x-request-id`) */
      id: string;
    }
    /** JWT 载荷挂载到 `req.user`（与 Passport 约定一致） */
    interface User {
      userId: string;
      username: string;
      role: string;
    }
  }
}

export {};
