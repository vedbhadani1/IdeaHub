import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';

/**
 * Standardized success response utility
 * 
 * NOTE: There is no errorResponse utility here by design.
 * Errors should THROW and be caught by the global error middleware,
 * which enforces the standardized error format.
 */
export const successResponse = <T>(
  res: Response,
  message: string,
  data?: T,
  meta: Record<string, any> = {},
  statusCode = StatusCodes.OK
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  });
};
