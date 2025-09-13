// Global type declarations for modules without TypeScript support

// PostgreSQL types
declare module 'pg' {
  export interface PoolConfig {
    user?: string;
    host?: string;
    database?: string;
    password?: string;
    port?: number;
    ssl?: boolean | object;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    connectionString?: string;
  }

  export interface QueryResult<T = any> {
    rows: T[];
    rowCount: number;
    command: string;
    oid: number;
    fields: any[];
  }

  export interface PoolClient {
    query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
    release(): void;
    end(): Promise<void>;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    connect(): Promise<PoolClient>;
    query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
    end(): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): this;
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  }

  export { PoolClient };
}

// Ensure these modules are recognized
declare module 'dotenv';
declare module 'redis';
declare module 'zod';
