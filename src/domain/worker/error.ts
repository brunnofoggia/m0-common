import { StageStatusEnum } from '../../types/stageStatus.type';

export class WorkerError extends Error {
    constructor(message, public statusUid: StageStatusEnum) {
        super(message);
    }
}
