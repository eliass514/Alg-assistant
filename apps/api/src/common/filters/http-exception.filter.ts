import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    logger.setContext(HttpExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();
      if (typeof responseBody === 'string') {
        message = responseBody;
      } else if (typeof responseBody === 'object' && responseBody !== null) {
        const responseMessage = (responseBody as Record<string, unknown>).message;
        const responseError = (responseBody as Record<string, unknown>).error;
        if (responseMessage) {
          message = responseMessage as string | string[];
        }
        if (responseError) {
          error = responseError as string;
        }
      }
    } else if (exception instanceof Error) {
      error = exception.message;
    }

    this.logger.error(
      {
        err: exception instanceof Error ? exception : undefined,
        statusCode: status,
        method: request.method,
        url: request.url,
        requestId: (request as { id?: string }).id,
        message,
        error,
      },
      'HTTP exception handled',
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
    });
  }
}
