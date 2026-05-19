import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { WinstonLoggersService } from '../logger/winston-loggers.service';

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly winston: WinstonLoggersService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload = exception instanceof HttpException ? exception.getResponse() : undefined;
    const message =
      typeof payload === 'string'
        ? payload
        : payload && typeof payload === 'object' && 'message' in payload
          ? (payload as { message: string | string[] }).message
          : 'Internal server error';

    const base = {
      reqId: req.id,
      requestId: req.id,
      method: req.method,
      path: req.url,
      statusCode: status,
      response: payload,
    };

    if (status >= 500) {
      this.winston.logServerError({
        ...base,
        err:
          exception instanceof Error
            ? { name: exception.name, message: exception.message, stack: exception.stack }
            : { detail: exception != null ? JSON.stringify(exception) : null },
      });
    } else {
      this.winston.logClientError(base);
    }

    const body = typeof payload === 'object' && payload !== null ? { ...payload, statusCode: status } : { statusCode: status, message };

    res.status(status).json(body);
  }
}
