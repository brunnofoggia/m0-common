export interface ExecutionListInterface {
    startedAt: string;
    finishedAt: string;
    statusUid: string;
}

export interface SystemInterface extends ExecutionListInterface {
    startedAt: string;
    finishedAt: string;
    statusUid: string;
    executionList?: ExecutionListInterface[];
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
    system?: Partial<SystemInterface>;
}
