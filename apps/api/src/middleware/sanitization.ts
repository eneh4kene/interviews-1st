import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@interview-me/types';

// HTML sanitization function
const sanitizeHtml = (input: string): string => {
    if (typeof input !== 'string') return input;
    
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

// SQL injection prevention
const sanitizeSql = (input: string): string => {
    if (typeof input !== 'string') return input;
    
    return input
        .replace(/['"\\]/g, '') // Remove quotes and backslashes
        .replace(/;/g, '') // Remove semicolons
        .replace(/--/g, '') // Remove SQL comments
        .replace(/\/\*/g, '') // Remove block comment starts
        .replace(/\*\//g, ''); // Remove block comment ends
};

// Recursively sanitize object properties
const sanitizeObject = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string') {
        return sanitizeHtml(sanitizeSql(obj));
    }
    
    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
    }
    
    if (typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                sanitized[key] = sanitizeObject(obj[key]);
            }
        }
        return sanitized;
    }
    
    return obj;
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    try {
        // Sanitize request body
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body);
        }
        
        // Sanitize query parameters
        if (req.query && typeof req.query === 'object') {
            req.query = sanitizeObject(req.query);
        }
        
        // Sanitize URL parameters
        if (req.params && typeof req.params === 'object') {
            req.params = sanitizeObject(req.params);
        }
        
        next();
    } catch (error) {
        console.error('Input sanitization error:', error);
        const response: ApiResponse = {
            success: false,
            error: 'Invalid input data',
        };
        res.status(400).json(response);
    }
};

// Specific sanitization for text fields
export const sanitizeTextFields = (fields: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            if (req.body && typeof req.body === 'object') {
                fields.forEach(field => {
                    if (req.body[field] && typeof req.body[field] === 'string') {
                        req.body[field] = sanitizeHtml(req.body[field]);
                    }
                });
            }
            
            next();
        } catch (error) {
            console.error('Text field sanitization error:', error);
            const response: ApiResponse = {
                success: false,
                error: 'Invalid text input',
            };
            res.status(400).json(response);
        }
    };
};
