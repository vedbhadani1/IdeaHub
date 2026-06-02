import { Prisma } from '@prisma/client';
import { AppError } from './AppError';
import { StatusCodes } from 'http-status-codes';

export const handlePrismaError = (err: Prisma.PrismaClientKnownRequestError): AppError => {
  switch (err.code) {
    case 'P2002':
      // Unique constraint failed
      const target = (err.meta?.target as string[])?.join(', ') || 'field';
      return new AppError(
        `Duplicate value entered for ${target}. Please use another value.`,
        StatusCodes.CONFLICT,
        'DUPLICATE_ERROR'
      );
    case 'P2014':
      // Invalid ID
      return new AppError('Invalid ID provided.', StatusCodes.BAD_REQUEST, 'INVALID_ID');
    case 'P2003':
      // Invalid input data
      return new AppError('Invalid input data.', StatusCodes.BAD_REQUEST, 'INVALID_INPUT');
    case 'P2025':
      // Record not found
      return new AppError('Resource not found.', StatusCodes.NOT_FOUND, 'NOT_FOUND');
    default:
      return new AppError('Database error occurred.', StatusCodes.INTERNAL_SERVER_ERROR, 'DB_ERROR', false);
  }
};
