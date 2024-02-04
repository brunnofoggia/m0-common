import { size, indexOf, omit, defaultsDeep, pickBy, bind, defaults } from 'lodash';
import _debug from 'debug';
const debug = _debug('worker:stage');

import { exitRequest } from 'node-labs/lib/utils/errors';
import { applyMixins } from 'node-labs/lib/utils/mixin';

import { BodyInterface } from '../../interfaces/body.interface';
import { ResultInterface, SystemInterface } from '../../interfaces/result.interface';
import { StageFeatureMethods, StageParts, StageAllProperties, StageFeatureProperties } from '../../interfaces/stageParts.interface';

import { StageStatusEnum } from '../../types/stageStatus.type';
import { ERROR } from '../../types/error.type';
import { WorkerError } from './error';

import { DynamicWorkerMixin } from './mixins/system/dynamicWorker.mixin';
import { InjectionMixin } from './mixins/system/injection.mixin';
import { LifeCycleMixin } from './mixins/system/lifecycle.mixin';
import { SecretsMixin } from './mixins/system/secrets.mixin';
import { DateMixin } from './mixins/system/date.mixin';
import { ExecutionInfoMixin } from './mixins/system/executionInfo';

import { StageGeneric } from './stage.generic';
import { StageExecutionProvider } from '../../providers/stageExecution.provider';

export class StageWorker extends StageGeneric implements StageParts {
    static getSolutions;

    fakeResult = false;
    defaultConfig: any = {};
    defaultOptions: any = {};

    body: BodyInterface;
    system: Partial<SystemInterface> = {};

    stageExecutionMocked = false;

    rootDir: string;
    moduleDir: string;
    stageDir: string;

    moduleDomain: any = {};
    stageDomain: any = {};

    _set(options) {
        super._set(options);
        this.setDirs();
    }

    _getSolutions() {
        return StageWorker.getSolutions();
    }

    getProjectUid() {
        return this.moduleConfig.projectUid || this.project.uid;
    }

    setDirs() {
        this.rootDir = [this.getProjectUid(), this.transactionUid].join('/');
        this.moduleDir = [this.rootDir, this.moduleConfig.moduleUid].join('/');
        this.stageDir = [this.rootDir, this.stageConfig.stageUid].join('/');
    }

    async checkExecution() {
        if (!this.stageExecution) exitRequest(ERROR.NO_STAGE_EXEC_DATA);
    }

    async __debug(...args) {
        if (!this.fakeResult) {
            debug(...args);
        }
    }

    public async initialize(uniqueId: string): Promise<ResultInterface> {
        this.__debug('-------------------------\ninitialize');
        this.__debug('set unique id', uniqueId);
        this._setUniqueId(uniqueId);
        this.__debug('find module+stage execution');
        this.stageExecution = await this.findLastStageExecution();
        if (!size(this.stageExecution)) return;

        this.moduleExecution = this.stageExecution.moduleExecution;

        this.prepareConfig();
        this.prepareOptions();

        let result;
        if (!this.fakeResult) {
            result = await this._execute();

            debug('check result');
            if (this._checkResult(result)) {
                result = await this.result(result);
            }

            debug('on destroy');
            await this._onDestroy();
            debug('builder done\n-------------------------');
        } else {
            result = await this.result(this.statusDone());
        }
        return result;
    }

    async _execute(): Promise<ResultInterface | null> {
        await this.checkExecution();
        let result;

        this.system.startedAt = new Date().toISOString();
        try {
            debug('on initialize');
            await this._onInitialize();

            debug('execute');
            result = await this.execute();
        } catch (error) {
            this.logError(error);
            result = this.buildExecutionError(error);
        }
        this.system.finishedAt = new Date().toISOString();

        return result;
    }

    buildExecutionError(error) {
        const result: any = {
            statusUid: StageStatusEnum.UNKNOWN,
            errorCode: error.code || '',
            errorMessage: error.message || '',
        };

        if (error.statusUid) result.statusUid = error.statusUid;

        return result;
    }

    public logError(error) {
        console.log(this.stageDir, typeof error === 'string' ? error : error.stack);
    }

    async execute(): Promise<ResultInterface | null> {
        console.log('stage.builder execute()', this.stageUid);
        return { statusUid: StageStatusEnum.DONE };
    }

    public async result(result: ResultInterface): Promise<ResultInterface> {
        try {
            result.statusUid = result.statusUid || StageStatusEnum.UNKNOWN;

            // runs before trigger result to catch errors
            result._options?.after && (await result._options.after());
        } catch (error) {
            this.logError(error);
            result = this.buildExecutionError(error);
        }

        await this.triggerExecutionResult(result);
        return result;
    }

    async findLastStageExecution() {
        try {
            const index = this.getIndex();
            if (this.body.mockStageExecution) return this.mockStageExecution();
            const stageExecution = await StageExecutionProvider.findByTransactionAndModuleAndIndex(
                this.transactionUid,
                this.stageConfig.stageUid,
                index,
            );

            if (!stageExecution || !size(stageExecution)) {
                throw new WorkerError(
                    `stageExecution not found for
                transactionUid:${this.transactionUid} , stageUid: ${this.stageConfig?.stageUid} , index: ${index}
                ("${JSON.stringify(stageExecution)}")`,
                    StageStatusEnum.ERROR,
                );
            } else if (
                stageExecution.statusUid &&
                indexOf(
                    [
                        // StageStatusEnum.DONE,
                        StageStatusEnum.FAILED,
                        StageStatusEnum.UNKNOWN,
                    ],
                    stageExecution.statusUid,
                ) === -1
            ) {
                return stageExecution;
            }

            throw new WorkerError(
                `invalid stageExecution for
            transactionUid:${this.transactionUid} , stageUid: ${this.stageConfig?.stageUid} , index: ${index}
            ("${JSON.stringify(stageExecution)}")`,
                StageStatusEnum.FAILED,
            );
        } catch (err) {
            debug(err);
            return null;
        }
    }

    async triggerStage(_name, body) {
        const { events } = await this._getSolutions();
        // const name = _name.replace(/\//g, '-');
        return events.sendToQueue(_name, body);
    }

    async triggerExecutionResult(result: ResultInterface) {
        const index = this.getIndex();
        debug(`result:`, result, '; stage:', this.stageUid, '; index: ', index);
        if (typeof result === 'undefined' || result === null || this.stageExecutionMocked) return;

        result.statusUid = result.statusUid || StageStatusEnum.UNKNOWN;
        // avoid infinity loop when waiting multiple child process
        // but with this waiting status never is saved
        // if (result.status === StageStatusEnum.WAITING) return;

        const { events } = await this._getSolutions();
        const body = {
            transactionUid: this.transactionUid,
            stageUid: this.stageUid,
            options: {
                index,
            },
            result: {
                ...omit(result, '_options'),
                errorMessage: (result.errorMessage || '').split('\n')[0],
            },
        };

        events.sendToQueue(this.worflowEventName, body);
    }

    public getDefaultConfig() {
        return this.defaultConfig;
    }

    public getDefaultOptions() {
        return this.defaultOptions;
    }

    prepareConfig(_config = null) {
        _config === null && (_config = this.stageConfig.config);
        this.stageConfig.config = defaultsDeep({}, this.stageExecution.data, _config, this.getDefaultConfig());
        return this.stageConfig.config;
    }

    prepareOptions(_options = null) {
        _options === null && (_options = this.stageConfig.options);
        this.stageConfig.options = defaultsDeep({}, this.stageExecution.data, _options, this.getDefaultOptions());
        return this.stageConfig.options;
    }

    mockStageExecution() {
        this.stageExecutionMocked = true;
        const mock = typeof this.body.mockStageExecution === 'object' ? this.body.mockStageExecution : {};
        return defaultsDeep(mock, {
            moduleExecutionId: 0,
            stageConfigId: 0,
            data: {},
            statusUid: StageStatusEnum.ASYNC,
        });
    }

    fowardInternalOptions() {
        return pickBy(this.stageExecution.data, (value, key) => {
            return /^_[a-zA-Z]/.test(key);
        });
    }

    omitInternalOptions() {
        return pickBy(this.stageExecution.data, (value, key) => {
            return !/^_[a-zA-Z]/.test(key);
        });
    }

    // getters
    get(): StageAllProperties {
        return {
            body: this.body,

            transactionUid: this.transactionUid,
            moduleUid: this.moduleUid,
            stageUid: this.stageUid,
            stageName: this.stageName,

            moduleConfig: this.moduleConfig,
            stageConfig: this.stageConfig,
            project: this.project,

            moduleExecution: this.moduleExecution,
            stageExecution: this.stageExecution,

            rootDir: this.rootDir,
            stageDir: this.stageDir,
        };
    }

    extractMethods(): StageFeatureMethods {
        return {
            // options
            isStageOptionActivated: bind(this.isStageOptionActivated, this),
            isStageOptionDeactivated: bind(this.isStageOptionDeactivated, this),
            isModuleOptionActivated: bind(this.isModuleOptionActivated, this),
            isModuleOptionDeactivated: bind(this.isModuleOptionDeactivated, this),
            isInheritedOptionActivated: bind(this.isInheritedOptionActivated, this),
            isInheritedOptionDeactivated: bind(this.isInheritedOptionDeactivated, this),
            // service
            getService: bind(this.getService, this),
            // secrets
            getGlobalSecret: bind(this.getGlobalSecret, this),
            getModuleSecret: bind(this.getModuleSecret, this),
            getStageSecret: bind(this.getStageSecret, this),
            // date
            getDate: bind(this.getDate, this),
            getTimezoneString: bind(this.getTimezoneString, this),
            getTimezoneOffset: bind(this.getTimezoneOffset, this),
            // trace
            logError: bind(this.logError, this),
            getExecutionInfo: bind(this.getExecutionInfo, this),
            getExecutionInfoValue: bind(this.getExecutionInfoValue, this),
            setExecutionInfoValue: bind(this.setExecutionInfoValue, this),
            increaseExecutionInfoValue: bind(this.increaseExecutionInfoValue, this),
            getRetryAttempt: bind(this.getRetryAttempt, this),
            getRetryLimit: bind(this.getRetryLimit, this),
        };
    }

    getStageParts(): StageParts {
        return defaults(this.extractMethods(), this.get());
    }

    static _getWorker(stageConfig, project) {
        return stageConfig?.config?.worker || project?._config?.defaultWorker;
    }

    getWorker() {
        return StageWorker._getWorker(this.stageConfig, this.project) || this.getDefaultWorker();
    }

    getDefaultWorker() {
        return StageGeneric._getDefaultWorker();
    }

    getEnv() {
        return process.env.NODE_ENV || 'dev';
    }

    getRootDir() {
        return this.rootDir;
    }

    getStageDir() {
        return this.stageDir;
    }

    getService(Service): any {
        return new Service(this.uniqueId);
    }

    getRetryAttempt(increaseByOne = true) {
        return super.getRetryAttempt(increaseByOne);
    }
}

export interface StageWorker
    extends StageFeatureProperties,
        LifeCycleMixin,
        DynamicWorkerMixin,
        InjectionMixin,
        DateMixin,
        SecretsMixin,
        ExecutionInfoMixin {}

applyMixins(StageGeneric, [LifeCycleMixin, DynamicWorkerMixin, InjectionMixin, DateMixin, SecretsMixin, ExecutionInfoMixin]);
