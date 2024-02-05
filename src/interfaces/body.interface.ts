import { ResultInterface } from './result.interface';

export interface BodyInterface {
    stageUid: string;
    executionUid?: string;

    transactionUid?: string;
    projectUid?: string;

    mergeSnapshot?: any;

    date?: Date;
    options?: {
        [key: string]: any;
    };

    result?: ResultInterface;
    mockStageExecution?: any;
}
