import { StageStructureProperties } from '../../../../interfaces/stageParts.interface';

export abstract class ExecutionInfoMixin {
    abstract executionInfo: any;

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
}

export interface ExecutionInfoMixin extends StageStructureProperties {}
