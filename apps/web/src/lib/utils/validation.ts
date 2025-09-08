import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

// Custom validation middleware
export const validateRequest = (schema: any) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            // If schema has a 'body' property, validate the body
            if (schema.body) {
                schema.body.parse(req.body);
            } else {
                // Otherwise, try to parse the entire request
                schema.parse(req);
            }
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: error.errors,
                });
            }
            next(error);
        }
    };
}; 