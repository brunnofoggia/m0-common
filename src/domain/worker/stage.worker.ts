import { size, indexOf, omit, defaultsDeep, pickBy, bind, defaults, cloneDeep } from 'lodash';
import _debug from 'debug';
const debug = _debug('worker:stage');

import { exitRequest } from 'node-labs/lib/utils/errors';
import { applyMixins } from 'node-labs/lib/utils/mixin';

import { BodyInterface } from '../../interfaces/body.interface';
import { ResultInterface, SystemInterface } from '../../interfaces/result.interface';
import { StageFeatureMethods, StageParts, StageAllProperties } from '../../interfaces/stageParts.interface';

import { StageStatusEnum } from '../../types/stageStatus.type';
import { ERROR } from '../../types/error.type';
import { WorkerError } from './error';
import { StageExecutionFindError } from '../../types/stageExecution';

import { DynamicWorkerMixin } from './mixins/system/dynamicWorker.mixin';
import { InjectionMixin } from './mixins/system/injection.mixin';
import { LifeCycleMixin } from './mixins/system/lifecycle.mixin';
import { SecretsMixin } from './mixins/system/secrets.mixin';
import { DateMixin } from './mixins/system/date.mixin';
import { ExecutionInfoMixin } from './mixins/system/executionInfo';

import { StageGeneric } from './stage.generic';
import { PathMixin } from './mixins/system/path.mixin';
import { validateOptionsByRuleSet } from './utils/validate';

export class StageWorker extends StageGeneric implements StageParts {
    defaultConfig: any = {};
    defaultOptions: any = {};

    body: BodyInterface;
    system: Partial<SystemInterface> = {};

    stageExecutionMocked = false;

    moduleDomain: any = {};
    stageDomain: any = {};

    private _stageConfig_options;
    private _stageConfig_options_inputed = {};
    private _stageConfig_config;
    private _stageConfig_config_inputed = {};

    _set(options) {
        super._set(options);
        this.setPaths();
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

        this.system.startedAt = new Date().toISOString();
        let result, execResult;
        if (!this.fakeResult) {
            try {
                debug('lifecycle: on initialize');
                await this._onInitialize();

                execResult = await this._execute();
            } catch (error) {
                debug('lifecycle: cought error');
                this.logError(error);
                execResult = this.buildExecutionError(error);
            }
            result = await this._result(execResult);
        } else {
            result = await this.sendResultAsMessage(this.statusDone());
        }
        this.system.finishedAt = new Date().toISOString();

        return result;
    }

    async _execute(): Promise<ResultInterface | null> {
        await this.checkExecution();

        debug('lifecycle: before execute');
        await this._onBeforeExecute();

        debug('lifecycle: execute');
        const result = await this.execute();

        return result;
    }

    async _result(result: ResultInterface) {
        debug('lifecycle: check result');
        if (this._checkResult(result)) {
            result = await this.sendResultAsMessage(result);
        }

        debug('lifecycle: on destroy');
        await this._onDestroy();
        debug('lifecycle: builder done\n-------------------------\n');

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
        debug(this.stageDir, typeof error === 'string' ? error : error.stack);
    }

    async execute(): Promise<ResultInterface | null> {
        debug('stage.builder execute()', this.stageUid);
        return { statusUid: StageStatusEnum.DONE };
    }

    public async sendResultAsMessage(result: ResultInterface): Promise<ResultInterface> {
        debug(`result:`, result, '; stage:', this.stageUid, '; execUid:', this.executionUid, '; index: ', this.getIndex());
        if (typeof result === 'undefined' || result === null || this.stageExecutionMocked || this.body.options._pureExecution) return;

        try {
            result.statusUid = result.statusUid || StageStatusEnum.UNKNOWN;

            !result.system && (result.system = {});
            result.system.startedAt = this.system.startedAt;
            result.system.finishedAt = this.system.finishedAt;
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
            if (this.body.mockStageExecution || this.body.options._pureExecution) return this.mockStageExecution();
            // const stageExecution = await this._findLastExecution();
            const { stageExecution, error } = await this._findNonFailedLastStageExecution();

            switch (error) {
                case StageExecutionFindError.NOT_FOUND:
                    throw new WorkerError(
                        `stageExecution not found for
                        transactionUid:${this.transactionUid} , stageUid: ${this.stageConfig?.stageUid} , index: ${index}
                        ("${JSON.stringify(stageExecution)}")`,
                        StageStatusEnum.UNKNOWN,
                    );
                case StageExecutionFindError.FAILED:
                    throw new WorkerError(
                        `invalid stageExecution for
                    transactionUid:${this.transactionUid} , stageUid: ${this.stageConfig?.stageUid} , index: ${index}
                    ("${JSON.stringify(stageExecution)}")`,
                        StageStatusEnum.FAILED,
                    );
            }

            return stageExecution;
        } catch (err) {
            debug(err);
            return null;
        }
    }

    async triggerExecutionResult(result_: ResultInterface) {
        const result = {
            ...omit(result_, '_options'),
            errorMessage: (result_.errorMessage || '').split('\n')[0],
        };

        // avoid infinity loop when waiting multiple child process
        // but with this waiting status never is saved
        // if (result.status === StageStatusEnum.WAITING) return;
        const body = this.buildTriggerStageResultBody({}, result);
        return this.triggerStageToDefaultProvider(this.worflowEventName, body);
    }

    public getDefaultConfig() {
        return this.defaultConfig;
    }

    public getDefaultOptions() {
        return this.defaultOptions;
    }

    prepareConfig(_config: any = {}) {
        if (!this._stageConfig_config) this._stageConfig_config = cloneDeep(this.stageConfig.config);
        this._stageConfig_config_inputed = defaultsDeep(this._stageConfig_config_inputed, _config);

        this.stageConfig.config = defaultsDeep(
            {},
            this.stageExecution.data.config,
            this._stageConfig_config,
            this._stageConfig_config_inputed,
            this.getDefaultConfig(),
        );
        return this.stageConfig.config;
    }

    prepareOptions(_options: any = {}) {
        if (!this._stageConfig_options) this._stageConfig_options = cloneDeep(this.stageConfig.options);
        this._stageConfig_options_inputed = defaultsDeep(this._stageConfig_options_inputed, _options);

        this.stageConfig.options = defaultsDeep(
            {},
            this.stageExecution.data.options,
            this._stageConfig_options,
            this._stageConfig_options_inputed,
            this.getDefaultOptions(),
        );
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
        return pickBy(this.stageExecution.data.options, (value, key) => {
            return /^_[a-zA-Z]/.test(key);
        });
    }

    omitInternalOptions() {
        return pickBy(this.stageExecution.data.options, (value, key) => {
            return !/^_[a-zA-Z]/.test(key);
        });
    }

    // #region validations
    async getRequiredRuleSet() {
        return [];
    }

    async validateOptions() {
        validateOptionsByRuleSet(this, await this.getRequiredRuleSet());
    }

    async onBeforeExecute() {
        await this.validateOptions();
    }
    // #endregion

    // getters
    get(): StageAllProperties {
        return {
            body: this.body,

            projectUid: this.projectUid,
            transactionUid: this.transactionUid,
            moduleUid: this.moduleUid,
            stageUid: this.stageUid,
            executionUid: this.executionUid,
            stageName: this.stageName,

            moduleConfig: this.moduleConfig,
            stageConfig: this.stageConfig,
            project: this.project,

            moduleExecution: this.moduleExecution,
            stageExecution: this.stageExecution,

            ...this.getAllPaths(),
        };
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

    // #region legacy code
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
    // #endregion
}

export interface StageWorker
    extends LifeCycleMixin,
        DynamicWorkerMixin,
        InjectionMixin,
        DateMixin,
        PathMixin,
        SecretsMixin,
        ExecutionInfoMixin {}

applyMixins(StageWorker, [LifeCycleMixin, DynamicWorkerMixin, InjectionMixin, DateMixin, PathMixin, SecretsMixin, ExecutionInfoMixin]);
