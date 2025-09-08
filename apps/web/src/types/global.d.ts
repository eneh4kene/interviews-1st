// Global type declarations for modules without TypeScript support
declare module 'multer' {
    interface Multer {
        (options?: any): any;
        memoryStorage(): any;
        diskStorage(options: any): any;
    }

    const multer: Multer;
    export default multer;
}

// Additional type declarations for other modules if needed
declare module 'express-rate-limit' {
    const rateLimit: any;
    export default rateLimit;
}

declare module 'pino' {
    const pino: any;
    export default pino;
}

declare module 'pino-http' {
    const pinoHttp: any;
    export default pinoHttp;
}

declare module 'helmet' {
    const helmet: any;
    export default helmet;
}

declare module 'cors' {
    const cors: any;
    export default cors;
}

declare module 'cookie-parser' {
    const cookieParser: any;
    export default cookieParser;
}

// Express.js types for middleware files
declare module 'express' {
  interface Request {
    user?: any;
    body: any;
    params: any;
    query: any;
    headers: any;
    ip?: string;
    method: string;
    path: string;
    url: string;
    connection?: {
      remoteAddress?: string;
    };
    get(name: string): string | undefined;
  }
  
  interface Response {
    status(code: number): Response;
    json(data: any): Response;
    send(data: any): Response;
    end(chunk?: any, encoding?: any): Response;
    statusCode: number;
    setHeader(name: string, value: string): void;
    getHeaderNames(): string[];
    getHeader(name: string): string | number | string[] | undefined;
  }
  
  type NextFunction = (error?: any) => void;
  
  export { Request, Response, NextFunction };
}

// Ensure these modules are recognized
declare module 'dotenv';
declare module 'redis';
declare module 'zod';
