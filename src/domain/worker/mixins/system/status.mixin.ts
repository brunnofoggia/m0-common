import { defaultsDeep, size } from 'lodash';

import { StageStatusEnum } from '../../../../types/stageStatus.type';
import { StageStructureProperties } from '../../../../interfaces/stageParts.interface';
import { WorkerError } from '../../error';
import { ExecutionInfoMixin } from './executionInfo';
import { ResultInterface } from 'interfaces/result.interface';

export abstract class StatusMixin {
    abstract executionInfo: any;
    abstract executionError: WorkerError;
    abstract executionStatusUid: any;

    _status(_result: Partial<ResultInterface>, statusUid: any = null): any {
        const info = size(this.executionInfo) ? { info: this.getPlainExecutionInfo() } : {};
        const error = size(this.executionError)
            ? { errorMessage: this.executionError.message, errorCode: this.executionError['code'] }
            : {};
        const status = { statusUid: statusUid || this.executionStatusUid || this.stageConfig.config.retryStatus || StageStatusEnum.DONE };

        const options: any = defaultsDeep(_result, info, error, status);

        return options;
    }

    status(result: Partial<ResultInterface> = {}, statusUid: any = null): any {
        return this._status(result, statusUid);
    }

    statusDone(result: Partial<ResultInterface> = {}) {
        return this._status(result, StageStatusEnum.DONE);
    }

    statusFailed(result: Partial<ResultInterface> = {}) {
        return this._status(result, StageStatusEnum.FAILED);
    }

    statusError(result: Partial<ResultInterface> = {}) {
        return this._status(result, StageStatusEnum.ERROR);
    }

    statusUnknown(result: Partial<ResultInterface> = {}) {
        return this._status(result, StageStatusEnum.UNKNOWN);
    }

    statusWaiting(result: Partial<ResultInterface> = {}) {
        return this._status(result, StageStatusEnum.WAITING);
    }
}

export interface StatusMixin extends StageStructureProperties, ExecutionInfoMixin {}
