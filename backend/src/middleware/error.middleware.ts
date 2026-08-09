import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  statusCode?: number;
  errorCode?: string;
}

export const errorMiddleware = (
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const errorCode = err.errorCode || 'INTERNAL_ERROR';

  if (process.env.NODE_ENV !== 'production') {
    console.error('[ERROR]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorCode,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

export class ApiError extends Error {
  statusCode: number;
  errorCode: string;

  constructor(statusCode: number, message: string, errorCode: string = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.name = 'ApiError';
  }
}
