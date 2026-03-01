
declare module 'wa-sqlite' {
    export class SQLite3 {
        static create(module: any): SQLite3;
        vfs_register(vfs: any, makeDefault: boolean): void;
        open_v2(filename: string, flags: number, vfs?: string): Promise<number>;
        prepare_v2(db: number, sql: string): Promise<number>;
        step(stmt: number): Promise<number>;
        finalize(stmt: number): Promise<void>;
        column_count(stmt: number): number;
        column_type(stmt: number, i: number): number;
        column(stmt: number, i: number): any;
        column_int64(stmt: number, i: number): bigint | number;
        column_double(stmt: number, i: number): number;
        column_text(stmt: number, i: number): string;
        column_blob(stmt: number, i: number): Uint8Array;
        bind(stmt: number, i: number, value: any): void;
        exec(db: number, sql: string): Promise<void>;

        static OPEN_READWRITE: number;
        static OPEN_CREATE: number;
        static ROW: number;
        static DONE: number;
        static INTEGER: number;
        static FLOAT: number;
        static TEXT: number;
        static BLOB: number;
        static NULL: number;
    }
}

declare module 'wa-sqlite/dist/wa-sqlite.mjs' {
    const factory: () => Promise<any>;
    export default factory;
}

declare module 'wa-sqlite/src/examples/IDBBatchAtomicVFS.js' {
    export class IDBBatchAtomicVFS {
        constructor(name: string);
        ready: Promise<void>;
    }
}
