import Decimal from 'decimal.js';

import { StageStatusEnum } from '../../../../types/stageStatus.type';
import { StageStructureProperties } from '../../../../interfaces/stageParts.interface';
import { WorkerError, WorkerErrorWithCode } from '../../error';
import { get, isString, set, size } from 'lodash';

export abstract class ExecutionInfoMixin {
    abstract executionInfo: any;
    abstract executionError: WorkerErrorWithCode;
    abstract executionStatusUid: any;

    getExecutionInfo() {
        return this.executionInfo;
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

    getExecutionInfoValue(path) {
        const info = this.getExecutionInfo();
        return get(info, path);
    }

    setExecutionInfoValues(json) {
        for (const key in json) this.setExecutionInfoValue(key, json[key]);
    }

    setExecutionInfoValue(path, value) {
        set(this.executionInfo, path, value);
    }

    pushExecutionInfoValue(path, ...values) {
        const currentArr: Array<any> = get(this.executionInfo, path) || [];
        currentArr.push(...values);
        set(this.executionInfo, path, currentArr);
    }

    increaseExecutionInfoValue(path, increase: number) {
        const currentValue = get(this.executionInfo, path) || 0;
        set(this.executionInfo, path, currentValue + increase);
    }

    increaseDecimalExecutionInfoValue(path, increase: string | number | Decimal) {
        let currentValue = get(this.executionInfo, path) || 0;
        if (!currentValue || !(currentValue instanceof Decimal)) currentValue = new Decimal(0);

        set(this.executionInfo, path, currentValue.plus(increase));
    }

    getExecutionError() {
        return this.executionError || {};
    }

    getExecutionStatus() {
        return this.executionStatusUid || null;
    }

    setExecutionError(
        error: string | { message: string } | Error | WorkerError | WorkerErrorWithCode,
        statusUid: any = StageStatusEnum.FAILED,
        override: boolean = false,
    ) {
        if (this.getExecutionStatus() !== null && !override) return this.executionError;
        if (isString(error)) error = { message: error };

        const errorMessage = error.message;
        const errorCode = (error['code'] || '0') + '';
        const errorStatus = statusUid || StageStatusEnum.FAILED;

        // if (!this.executionError) {
        // using WorkerError class so it can be thrown
        this.executionError = new WorkerErrorWithCode(errorMessage, errorCode, errorStatus);
        // }

        if (statusUid) this.executionStatusUid = statusUid;
        return this.executionError;
    }
}

export interface ExecutionInfoMixin extends StageStructureProperties {}
