export interface ConnectionData {
    alias: string;
    options?: ConnectionDataOptions;
}

export interface ConnectionDataOptions {
    product?: string;
    secretPath?: string;
}
