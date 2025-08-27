import { StageStatusEnum } from '../../types/stageStatus.type';

export class WorkerError extends Error {
    constructor(message, public statusUid: StageStatusEnum = StageStatusEnum.FAILED) {
        super(message);
    }
}

export class WorkerErrorWithCode extends Error {
    constructor(message, public code: string, public statusUid: StageStatusEnum = StageStatusEnum.FAILED) {
        super(message);
    }
}
