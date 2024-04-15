import { StageStatusEnum } from '../../../../types/stageStatus.type';
import { StageStructureProperties } from '../../../../interfaces/stageParts.interface';
import { WorkerError } from '../../error';

export abstract class ExecutionInfoMixin {
    abstract executionInfo: any;
    abstract executionError: WorkerError;
    abstract executionStatusUid: any;

    getExecutionInfo() {
        return this.executionInfo || {};
    }

    getExecutionInfoValue(field) {
        const info = this.getExecutionInfo();
        return info[field];
    }

    setExecutionInfoValue(field, value) {
        this.executionInfo[field] = value;
    }

    increaseExecutionInfoValue(field, value: number) {
        this.executionInfo[field] = (this.executionInfo[field] || 0) + value;
    }

    getExecutionError() {
        return this.executionError || {};
    }

    getExecutionStatus() {
        return this.executionStatusUid || null;
    }

    setExecutionError(error, statusUid: any = StageStatusEnum.FAILED) {
        const errorMessage = error.message;
        const errorCode = error.code + '' || '0';
        const errorStatus = statusUid || StageStatusEnum.FAILED;

        // if (!this.executionError) {
        // using WorkerError class so it can be thrown
        this.executionError = new WorkerError(errorMessage, errorStatus);
        this.executionError['code'] = errorCode;
        // }

        if (statusUid) this.executionStatusUid = statusUid;
        return this.executionError;
    }
}

export interface ExecutionInfoMixin extends StageStructureProperties {}
