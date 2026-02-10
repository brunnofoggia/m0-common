import { ResultInterface } from './result.interface';

export interface BodyInterface {
    m0QueuePrefix?: string;
    queuePrefix?: string;
    // queue message identifier
    messageUid?: string;

    stageUid: string;
    executionUid?: string;

    transactionUid?: string;
    projectUid?: string;

    mergeSnapshot?: any;

    date?: Date;
    options?: {
        [key: string]: any;
    };
    config?: {
        [key: string]: any;
    };

    result?: ResultInterface;
    mockStageExecution?: any;
}
