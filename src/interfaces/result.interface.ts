export interface ResultInterface {
    statusUid: string;
    startedAt?: string;
    info?: any;
    errorCode?: string;
    errorMessage?: string;
    config?: any;

    _options?: {
        [key: string]: any;
    };
}
