import type { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { sendError, ErrorCode } from '../utils/errors.ts';
import { ErrorMessage } from '../utils/errorMessages.ts';

export const validate = (schema: z.ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = (await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })) as any;
      // Replace request values with the validated/parsed data
      if (parsed.body !== undefined) {
        req.body = parsed.body;
      }
      if (parsed.query !== undefined) {
        Object.defineProperty(req, 'query', {
          value: parsed.query,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      if (parsed.params !== undefined) {
        Object.defineProperty(req, 'params', {
          value: parsed.params,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      next();
    } catch (error) {
      console.error("Validation error:", error);
      if (error instanceof ZodError || (error as any)?.name === 'ZodError') {
        const issues = (error as any).issues || [];
        const details = issues.map((err: any) => {
          // err.path looks like ['body', 'email'] or ['query', 'token']
          // Remove the first segment (body/query/params) to display the field name clearly
          const field = err.path.slice(1).join('.');
          const location = err.path[0] || 'body';
          return {
            location,
            field: field || undefined,
            message: err.message,
          };
        });
        return sendError(
          res,
          400,
          ErrorCode.VALIDATION_ERROR,
          ErrorMessage.VALIDATION_FAILED,
          details
        );
      }
      return sendError(
        res,
        500,
        ErrorCode.SERVER_ERROR,
        ErrorMessage.INTERNAL_VALIDATION_ERROR
      );
    }
  };
};
