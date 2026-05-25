import type { ErrorCode } from '@/shared/errors/error-codes'

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}