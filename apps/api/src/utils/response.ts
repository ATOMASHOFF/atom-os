// apps/api/src/utils/response.ts
import { Response } from 'express';

export const ok = <T>(res: Response, data: T, status = 200) =>
  res.status(status).json({ data });

export const created = <T>(res: Response, data: T) =>
  res.status(201).json({ data });

export const noContent = (res: Response) =>
  res.status(204).send();

export const badRequest = (res: Response, message: string, details?: unknown) =>
  res.status(400).json({ error: message, code: 'BAD_REQUEST', details });

export const unauthorized = (res: Response, message = 'Unauthorized') =>
  res.status(401).json({ error: message, code: 'UNAUTHORIZED' });

export const forbidden = (res: Response, message = 'Forbidden') =>
  res.status(403).json({ error: message, code: 'FORBIDDEN' });

export const notFound = (res: Response, message = 'Not found') =>
  res.status(404).json({ error: message, code: 'NOT_FOUND' });

export const conflict = (res: Response, message: string) =>
  res.status(409).json({ error: message, code: 'CONFLICT' });

export const serverError = (res: Response, message = 'Internal server error', err?: unknown) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[SERVER ERROR]', err);
  }
  return res.status(500).json({ error: message, code: 'SERVER_ERROR' });
};

export const validationError = (res: Response, errors: unknown) =>
  res.status(400).json({ error: 'Validation failed', code: 'VALIDATION_ERROR', details: errors });
