import { defaultsDeep, size } from 'lodash';

import { StageStatusEnum } from '../../../../types/stageStatus.type';
import { StageStructureProperties } from '../../../../interfaces/stageParts.interface';
import { WorkerError } from '../../error';

export abstract class StatusMixin {
    abstract executionInfo: any;
    abstract executionError: WorkerError;
    abstract executionStatusUid: any;

    _status(_options: any, statusUid: any = null) {
        const info = size(this.executionInfo) ? { info: this.executionInfo } : {};
        const error = size(this.executionError)
            ? { errorMessage: this.executionError.message, errorCode: this.executionError['code'] }
            : {};
        const status = { statusUid: statusUid || this.executionStatusUid || StageStatusEnum.DONE };

        const options: any = defaultsDeep(_options, info, error, status);

        return options;
    }

    status(options: any = {}, statusUid: any = null) {
        return this._status(options, statusUid);
    }

    statusDone(options: any = {}) {
        return this._status(options, StageStatusEnum.DONE);
    }

    statusFailed(options: any = {}) {
        return this._status(options, StageStatusEnum.FAILED);
    }

    statusError(options: any = {}) {
        return this._status(options, StageStatusEnum.ERROR);
    }

    statusUnknown(options: any = {}) {
        return this._status(options, StageStatusEnum.UNKNOWN);
    }

    statusWaiting(options: any = {}) {
        return this._status(options, StageStatusEnum.WAITING);
    }
}

export interface StatusMixin extends StageStructureProperties {}
