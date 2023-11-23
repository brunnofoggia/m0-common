import { ModuleExecutionInterface } from '../../interfaces/moduleExecution.interface';
import { ProjectInterface } from '../../interfaces/project.interface';
import { ModuleConfigInterface } from '../../interfaces/moduleConfig.interface';
import { StageConfigInterface } from '../../interfaces/stageConfig.interface';
import { StageExecutionInterface } from '../../interfaces/stageExecution.interface';

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

    protected abstract _set(options);
}
