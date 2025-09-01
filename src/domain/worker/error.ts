import { indexOf, values } from 'lodash';
import { StageStatusEnum } from '../../types/stageStatus.type';

export class WorkerError extends Error {
    public statusUid: StageStatusEnum;
    public code: string;

    constructor(message, code: string = '', statusUid: StageStatusEnum = null) {
        super(message);

        if (code && !statusUid && indexOf(values(StageStatusEnum), code) >= 0) {
            statusUid = code as StageStatusEnum;
            code = '';
        }

        this.code = code || '0';
        this.statusUid = statusUid || StageStatusEnum.FAILED;
    }
}
