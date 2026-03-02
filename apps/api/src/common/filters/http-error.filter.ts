import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    const requestId = request.requestId || (request.headers['x-request-id'] as string) || undefined;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Unexpected error';

    if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      code = 'RATE_LIMIT_EXCEEDED';
      message = 'Too many requests, please try again later';
      response.setHeader('Retry-After', '60');

      this.logger.warn({
        event: 'http.rate_limit',
        method: request.method,
        path: request.route?.path ?? request.path,
        requestId,
        message: 'Rate limit exceeded',
      });
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res: any = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else {
        message = res.message || message;
        code = res.code || code;
      }

      if (status === HttpStatus.BAD_REQUEST && Array.isArray(res.message)) {
        message = res.message.join('; ');
        code = 'VALIDATION_ERROR';
      }

      // Log server-side faults only — client errors (4xx) are expected and tracked by metrics
      if (status >= 500) {
        this.logger.error(
          {
            event: 'http.server_error',
            status,
            code,
            method: request.method,
            path: request.route?.path ?? request.path,
            requestId,
            message,
          },
          exception instanceof Error ? exception.stack : undefined,
        );
      }
    } else {
      // Unhandled non-HTTP exception — always an error
      this.logger.error(
        {
          event: 'http.unhandled_exception',
          status,
          code,
          method: request.method,
          path: request.route?.path ?? request.path,
          requestId,
          message: exception instanceof Error ? exception.message : 'Unknown error',
        },
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      error: {
        code,
        message,
        requestId,
      },
    });
  }
}
