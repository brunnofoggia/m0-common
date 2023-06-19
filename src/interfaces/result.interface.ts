export interface ResultInterface {
    statusUid: string;
    info?: any;
    errorCode?: string;
    errorMessage?: string;

    _options?: {
        [key: string]: any;
    };
}
