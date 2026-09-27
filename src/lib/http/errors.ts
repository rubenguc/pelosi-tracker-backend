export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFound = (msg = 'Resource not found') =>
  new HttpError(404, 'NOT_FOUND', msg);

export const badRequest = (msg = 'Bad request', details?: unknown) =>
  new HttpError(400, 'BAD_REQUEST', msg, details);

export const unauthorized = (msg = 'Unauthorized') =>
  new HttpError(401, 'UNAUTHORIZED', msg);

export const forbidden = (msg = 'Forbidden') =>
  new HttpError(403, 'FORBIDDEN', msg);

export const conflict = (msg = 'Conflict') =>
  new HttpError(409, 'CONFLICT', msg);
