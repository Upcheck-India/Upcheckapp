import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Sentry } from '../sentry';

/**
 * Global catch-all that reports 5xx / unhandled exceptions to Sentry, then
 * delegates to Nest's default formatting via BaseExceptionFilter — so error
 * responses are unchanged. Client errors (4xx HttpException) are not reported.
 * Runs alongside the more-specific @Catch(QueryFailedError) filter.
 */
@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    if (status >= 500) {
      Sentry.captureException(exception);
    }
    super.catch(exception, host);
  }
}
