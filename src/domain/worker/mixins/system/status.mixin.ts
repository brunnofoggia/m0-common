import { defaultsDeep, size } from 'lodash';

import { StageStatusEnum } from '../../../../types/stageStatus.type';
import { StageStructureProperties } from '../../../../interfaces/stageParts.interface';

export abstract class StatusMixin {
    abstract executionInfo: any;

    _status(_options: any, statusUid: StageStatusEnum) {
        const info = size(this.executionInfo) ? { info: this.executionInfo } : {};
        const options: any = defaultsDeep(_options, info);
        return {
            ...options,
            statusUid,
        };
    }

    public statusDone(options: any = {}) {
        return this._status(options, StageStatusEnum.DONE);
    }

    public statusFailed(options: any = {}) {
        return this._status(options, StageStatusEnum.FAILED);
    }

    public statusError(options: any = {}) {
        return this._status(options, StageStatusEnum.ERROR);
    }

    public statusUnknown(options: any = {}) {
        return this._status(options, StageStatusEnum.UNKNOWN);
    }

    public statusWaiting(options: any = {}) {
        return this._status(options, StageStatusEnum.WAITING);
    }
}

export interface StatusMixin extends StageStructureProperties {}
