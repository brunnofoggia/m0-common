
export interface ResultInterface {
    statusUid: string;
    errorCode?: string;
    errorMessage?: string;

    _options?: {
        [key: string]: any;
    };
}
