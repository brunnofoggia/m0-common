export interface SystemInterface {
    startedAt: string;
    finishedAt: string;
}

export interface ResultInterface {
    statusUid: string;
    info?: any;
    errorCode?: string;
    errorMessage?: string;
    config?: any;

    // used only for result.after
    _options?: {
        [key: string]: any;
    };
    //
    system?: SystemInterface;
}
