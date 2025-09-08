import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@interview-me/types';

// Audit log interface
interface AuditLog {
    timestamp: string;
    userId?: string;
    email?: string;
    role?: string;
    action: string;
    resource?: string;
    resourceId?: string;
    ip: string;
    userAgent?: string;
    success: boolean;
    error?: string;
    metadata?: any;
}

// Audit logging middleware
export const auditLog = (action: string, resource?: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const originalSend = res.send;
        
        res.send = function(data: any) {
            // Log the audit event
            const auditEntry: AuditLog = {
                timestamp: new Date().toISOString(),
                userId: req.user?.userId,
                email: req.user?.email,
                role: req.user?.role,
                action,
                resource,
                resourceId: req.params?.id,
                ip: req.ip || req.connection.remoteAddress || 'unknown',
                userAgent: req.get('User-Agent'),
                success: res.statusCode < 400,
                error: res.statusCode >= 400 ? data : undefined,
                metadata: {
                    method: req.method,
                    path: req.path,
                    query: req.query,
                    statusCode: res.statusCode
                }
            };
            
            // Log to console (in production, this would go to a proper logging service)
            console.log('🔍 AUDIT LOG:', JSON.stringify(auditEntry, null, 2));
            
            // Call original send
            return originalSend.call(this, data);
        };
        
        next();
    };
};

// Security event logging
export const logSecurityEvent = (event: string, details: any) => {
    const securityLog = {
        timestamp: new Date().toISOString(),
        event,
        details,
        severity: 'HIGH'
    };
    
    console.log('🚨 SECURITY EVENT:', JSON.stringify(securityLog, null, 2));
};

// Authentication event logging
export const logAuthEvent = (event: string, userId?: string, email?: string, success: boolean = true, error?: string) => {
    const authLog = {
        timestamp: new Date().toISOString(),
        event,
        userId,
        email,
        success,
        error,
        severity: success ? 'INFO' : 'WARNING'
    };
    
    console.log('🔐 AUTH EVENT:', JSON.stringify(authLog, null, 2));
};

// Data access event logging
export const logDataAccess = (resource: string, action: string, userId?: string, resourceId?: string) => {
    const dataLog = {
        timestamp: new Date().toISOString(),
        resource,
        action,
        userId,
        resourceId,
        severity: 'INFO'
    };
    
    console.log('📊 DATA ACCESS:', JSON.stringify(dataLog, null, 2));
};
