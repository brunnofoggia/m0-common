export interface ConnectionData {
    isDynamic?: boolean;
    alias?: string;
    options?: ConnectionDataOptions;
}

export interface ConnectionDataOptions {
    product?: string;
    secretPath?: string;
    [key: string]: any; // other advanced connection options
}
