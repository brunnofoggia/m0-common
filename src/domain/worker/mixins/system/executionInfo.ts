import Decimal from 'decimal.js';

import { StageStatusEnum } from '../../../../types/stageStatus.type';
import { StageStructureProperties } from '../../../../interfaces/stageParts.interface';
import { WorkerError } from '../../error';
import { size } from 'lodash';

export abstract class ExecutionInfoMixin {
    abstract executionInfo: any;
    abstract executionError: WorkerError;
    abstract executionStatusUid: any;

    getExecutionInfo() {
        return this.executionInfo || {};
    }

    getPlainExecutionInfo() {
        const executionInfo = this.getExecutionInfo();
        if (size(executionInfo))
            for (const key in executionInfo) {
                if (executionInfo[key] instanceof Decimal) {
                    executionInfo[key] = +executionInfo[key].toFixed(4);
                }
            }

        return executionInfo || {};
    }

    getExecutionInfoValue(field) {
        const info = this.getExecutionInfo();
        return info[field];
    }

    setExecutionInfoValue(field, value) {
        this.executionInfo[field] = value;
    }

    increaseExecutionInfoValue(field, value: number) {
        const initialValue = this.executionInfo[field] || 0;
        this.executionInfo[field] = initialValue + value;
    }

    increaseDecimalExecutionInfoValue(field, value: number) {
        if (!this.executionInfo[field]) this.executionInfo[field] = new Decimal(0);
        this.executionInfo[field] = this.executionInfo[field].plus(value);
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
