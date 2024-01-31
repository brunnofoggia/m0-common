import { ModuleExecutionInterface } from '../../interfaces/moduleExecution.interface';
import { ProjectInterface } from '../../interfaces/project.interface';
import { ModuleConfigInterface } from '../../interfaces/moduleConfig.interface';
import { StageConfigInterface } from '../../interfaces/stageConfig.interface';
import { StageExecutionInterface } from '../../interfaces/stageExecution.interface';

import { StageStatusEnum } from '../../types/stageStatus.type';
import { defaultsDeep, isNumber, isString, size, uniqueId } from 'lodash';
import { applyMixins } from 'node-common/dist/utils/mixin';
import { ConfigMixin } from './mixins/config.mixin';

export abstract class StageGeneric {
    protected uniqueId: string;
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

    protected _set({ transactionUid, moduleUid, stageUid, stageName, moduleConfig, stageConfig, body }) {
        this.transactionUid = transactionUid;
        this.moduleUid = moduleUid;
        this.stageUid = stageUid;
        this.stageName = stageName;
        this.moduleConfig = moduleConfig;
        this.stageConfig = stageConfig;
        this.body = body;

        this.project = this.moduleConfig.project;
    }

    protected setUniqueId(_uniqueId = '') {
        !_uniqueId && (_uniqueId = [uniqueId('worker:'), new Date().toISOString()].join(':'));
        this.uniqueId = _uniqueId;
    }

    abstract initialize(uniqueId: string);

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

    checkResult(result) {
        return !!result;
    }

    // getIndex(): string | number {
    //     const index = this.stageExecution?.data?.index !== undefined ? this.stageExecution?.data?.index : this.body.options.index;
    //     return index === undefined ? -1 : index;
    // }

    getIndex(): number {
        const index = !isNaN(this.stageExecution?.data?.index) ? this.stageExecution?.data?.index : this.body.options.index;
        return index === undefined || index === null ? -1 : +index;
    }

    getRetryLimit() {
        return this.stageConfig.config.retryLimit || this.moduleConfig.config.retryLimit || this.project._config.retryLimit || 3;
    }

    getRetryAttempt(increaseByOne = false) {
        return (this.stageExecution.error?.length || 0) + +increaseByOne;
    }

    isLastAttempt() {
        const attempt = this.getRetryAttempt();
        const limit = this.getRetryLimit();

        return attempt >= limit;
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

    /** config */

    public isStageConfigActivated(configName) {
        return this._isActivated('stageConfig', configName);
    }

    public isStageConfigDeactivated(configName) {
        return this._isDeactivated('stageConfig', configName);
    }

    public isModuleConfigActivated(configName) {
        return this._isActivated('moduleConfig', configName);
    }

    public isModuleConfigDeactivated(configName) {
        return this._isDeactivated('moduleConfig', configName);
    }

    public isProjectConfigActivated(configName) {
        return this._isActivated('project', configName, '_config');
    }

    public isProjectConfigDeactivated(configName) {
        return this._isDeactivated('project', configName, '_config');
    }

    public isModuleStageConfigActivated(configName) {
        return this._isActivated('stageConfig', configName) || this._isActivated('moduleConfig', configName);
    }

    public isModuleStageConfigDeactivated(configName) {
        return this._isDeactivated('stageConfig', configName) || this._isDeactivated('moduleConfig', configName);
    }

    public isInheritedConfigActivated(configName) {
        return (
            this._isActivated('stageConfig', configName) ||
            this._isActivated('moduleConfig', configName) ||
            this._isActivated('project', configName, '_config')
        );
    }

    public isInheritedConfigDeactivated(configName) {
        return (
            this._isDeactivated('stageConfig', configName) ||
            this._isDeactivated('moduleConfig', configName) ||
            this._isDeactivated('project', configName, '_config')
        );
    }
}

export interface StageGeneric extends ConfigMixin {}

applyMixins(StageGeneric, [ConfigMixin]);
