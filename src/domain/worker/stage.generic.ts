import { ModuleExecutionInterface } from '../../interfaces/moduleExecution.interface';
import { ProjectInterface } from '../../interfaces/project.interface';
import { ModuleConfigInterface } from '../../interfaces/moduleConfig.interface';
import { StageConfigInterface } from '../../interfaces/stageConfig.interface';
import { StageExecutionInterface } from '../../interfaces/stageExecution.interface';

import { StageStatusEnum } from '../../types/stageStatus.type';
import { defaultsDeep, size } from 'lodash';

export abstract class StageGeneric {
    protected body: any;

    protected transactionUid: string;
    protected moduleUid: string;
    protected stageUid: string;
    protected stageName: string;

    protected moduleExecution: ModuleExecutionInterface;
    protected moduleConfig: ModuleConfigInterface;
    protected stageConfig: StageConfigInterface;
    protected project: ProjectInterface;

    protected stageExecution: StageExecutionInterface;

    protected executionInfo: any = {};

    constructor(options) {
        this._set(options);
    }

    getBody() {
        return this.body;
    }

    getTransactionUid() {
        return this.transactionUid;
    }

    getModuleConfig() {
        return this.moduleConfig;
    }

    getStageConfig() {
        return this.stageConfig;
    }

    getStageExecution() {
        return this.stageExecution;
    }

    getIndex() {
        const index = this.stageExecution?.data?.index || this.body.options.index;
        return typeof index === 'undefined' ? -1 : index;
    }

    getRetryLimit() {
        return this.stageConfig.config.retryLimit || this.moduleConfig.config.retryLimit || this.project._config.retryLimit || 3;
    }

    getRetryAttempt() {
        return this.stageExecution.error?.length || 0;
    }

    isLastAttempt() {
        return this.getRetryLimit() >= this.getRetryAttempt();
    }

    /* results */
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

    protected abstract _set(options);
}
