import { HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { HttpErrorFilter } from './http-error.filter';

function makeHost(opts: { requestId?: string; headers?: Record<string, string> } = {}) {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
  };
  const request = {
    method: 'GET',
    path: '/test',
    route: { path: '/test' },
    requestId: opts.requestId,
    headers: opts.headers ?? {},
    socket: {},
  };
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
    response,
    request,
  };
}

describe('HttpErrorFilter', () => {
  let filter: HttpErrorFilter;

  beforeEach(() => {
    filter = new HttpErrorFilter();
  });

  it('returns 429 with Retry-After header for ThrottlerException', () => {
    const host = makeHost() as any;
    filter.catch(new ThrottlerException(), host);

    expect(host.response.status).toHaveBeenCalledWith(429);
    expect(host.response.setHeader).toHaveBeenCalledWith('Retry-After', '60');
    expect(host.response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'RATE_LIMIT_EXCEEDED' }),
      }),
    );
  });

  it('returns correct status and code for HttpException with object response', () => {
    const host = makeHost() as any;
    filter.catch(new HttpException({ code: 'NOT_FOUND', message: 'Not found' }, HttpStatus.NOT_FOUND), host);

    expect(host.response.status).toHaveBeenCalledWith(404);
    expect(host.response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'NOT_FOUND', message: 'Not found' }),
      }),
    );
  });

  it('uses VALIDATION_ERROR code and joins array messages for 400 with array message', () => {
    const host = makeHost() as any;
    filter.catch(
      new HttpException({ message: ['field1 is required', 'field2 must be email'] }, HttpStatus.BAD_REQUEST),
      host,
    );

    const json = host.response.json.mock.calls[0][0];
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.message).toBe('field1 is required; field2 must be email');
  });

  it('handles HttpException with string response', () => {
    const host = makeHost() as any;
    filter.catch(new HttpException('Forbidden', HttpStatus.FORBIDDEN), host);

    expect(host.response.status).toHaveBeenCalledWith(403);
    const json = host.response.json.mock.calls[0][0];
    expect(json.error.message).toBe('Forbidden');
  });

  it('returns 500 for unhandled non-HTTP exception', () => {
    const host = makeHost() as any;
    filter.catch(new Error('Something exploded'), host);

    expect(host.response.status).toHaveBeenCalledWith(500);
    expect(host.response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INTERNAL_ERROR' }),
      }),
    );
  });

  it('includes requestId from request.requestId in response', () => {
    const host = makeHost({ requestId: 'req-abc' }) as any;
    filter.catch(new HttpException('Error', HttpStatus.INTERNAL_SERVER_ERROR), host);

    const json = host.response.json.mock.calls[0][0];
    expect(json.error.requestId).toBe('req-abc');
  });

  it('falls back to x-request-id header when requestId not on request object', () => {
    const host = makeHost({ headers: { 'x-request-id': 'hdr-123' } }) as any;
    filter.catch(new HttpException('Error', HttpStatus.BAD_GATEWAY), host);

    const json = host.response.json.mock.calls[0][0];
    expect(json.error.requestId).toBe('hdr-123');
  });
});
