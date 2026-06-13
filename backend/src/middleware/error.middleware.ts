import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../utils/AppError';
import { handlePrismaError } from '../utils/prismaError.util';

import multer from 'multer';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Log all errors internally (can be replaced with a proper logger like Winston/Pino)
  console.error(`[ERROR] ${req.id} -`, err);

  let error = { ...err };
  error.message = err.message;
  error.name = err.name;

  // 0. Multer File Upload Errors
  if (err instanceof multer.MulterError) {
    let message = 'Upload failed';
    let code: string = err.code;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File is too large. Maximum size is 10MB.';
      code = 'FILE_TOO_LARGE';
    }
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message,
      code,
    });
  }

  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = (err.issues || (err as any).errors || []).map((e: any) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: formattedErrors,
    });
  }

  // 2. Prisma Database Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    error = handlePrismaError(err);
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    error = new AppError('Invalid database query.', StatusCodes.BAD_REQUEST, 'DB_VALIDATION_ERROR');
  }

  // 3. JWT Authentication Errors
  if (err instanceof JsonWebTokenError) {
    error = new AppError('Invalid token. Please log in again.', StatusCodes.UNAUTHORIZED, 'INVALID_TOKEN');
  }
  if (err instanceof TokenExpiredError) {
    error = new AppError('Your token has expired. Please log in again.', StatusCodes.UNAUTHORIZED, 'TOKEN_EXPIRED');
  }

  // 4. Custom Operational AppError
  if (error instanceof AppError || err instanceof AppError) {
    const appErr = (error instanceof AppError ? error : err) as AppError;
    return res.status(appErr.statusCode).json({
      success: false,
      message: appErr.message,
      code: appErr.code,
    });
  }

  // 5. Unknown Server Errors (Fall-through)
  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: 'Something went very wrong!',
    code: 'INTERNAL_SERVER_ERROR',
    // DO NOT leak error details in production
    errors: process.env.NODE_ENV === 'development' ? err : undefined,
  });
};
