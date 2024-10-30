import _debug from 'debug';
const debug = _debug('worker:stage');
const essentialInfo = _debug('worker:essential:stage');
import { size, defaultsDeep, pickBy, cloneDeep, isArray, map, isString } from 'lodash';

import { exitRequest } from 'node-labs/lib/utils/errors';
import { applyMixins } from 'node-labs/lib/utils/mixin';

import { BodyInterface } from '../../interfaces/body.interface';
import { ResultInterface } from '../../interfaces/result.interface';
import { StageParts, StageAllProperties } from '../../interfaces/stageParts.interface';

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
import { StagesMixin } from './mixins/system/stages.mixin';
import { formatExecDate } from '../../utils/execDate';

export class StageWorker extends StageGeneric implements StageParts {
    defaultConfig: any = {};
    defaultOptions: any = {};
    stackTriggers: Array<BodyInterface> = [];

    moduleDomain: any = {};
    stageDomain: any = {};

    // unaltered options and config from database
    private _stageConfig_options;
    private _stageConfig_config;
    // stash of mixed options received along initialization process (stage options, domain options and custom options that maybe inserted along some process)
    // necessary to avoid losing inputed options during domain loading
    private _stageConfig_options_inputed = {};
    private _stageConfig_config_inputed = {};

    override _set(options) {
        super._set(options);
        this.setPaths();
    }

    async checkExecution() {
        if (!this.stageExecution) exitRequest(ERROR.NO_STAGE_EXEC_DATA);
    }

    async __debug(...args) {
        debug(...args);
    }

    // #region lifecycle
    // readonly initialize: (uniqueId: string) => Promise<ResultInterface> = async (uniqueId: string) => {
    async initialize(uniqueId: string): Promise<ResultInterface> {
        this.__debug('-------------------------\ninitialize');
        this.__debug('set unique id', uniqueId);
        this._setUniqueId(uniqueId);
        this.__debug('find module+stage execution');
        this.stageExecution = await this.findCurrentLastStageExecution();
        if (!size(this.stageExecution)) return;

        this.moduleExecution = this.stageExecution.moduleExecution;

        this.prepareConfig();
        this.prepareOptions();

        this.system.startedAt = new Date().toISOString();
        let result, execResult;
        if (!this.isFakeResult) {
            try {
                debug('lifecycle: on initialize');
                await this._onInitialize();

                execResult = await this._execute();
                await this._resultInfoFn(execResult);
            } catch (error) {
                essentialInfo('lifecycle: cought error');
                this.logError(error);

                execResult = this.buildExecutionError(error);
            }
            this.system.finishedAt = new Date().toISOString();
            result = await this._result(execResult);

            debug('lifecycle: on destroy');
            await this._onDestroy();
            debug('lifecycle: builder done\n-------------------------\n');
        } else {
            result = await this.sendResultAsMessage(this.statusDone());
        }

        return result;
    }
    async onInitialize(): Promise<void> {}

    async onBeforeExecute(): Promise<void> {
        await this.validateOptions();
    }

    private async _execute(): Promise<ResultInterface | null> {
        await this.checkExecution();

        debug('lifecycle: before execute');
        await this._onBeforeExecute();

        debug('lifecycle: execute');
        const result = await this.execute();

        debug('lifecycle: after execute');
        await this._onAfterExecute();

        return result;
    }

    async onAfterExecute(): Promise<void> {}

    async onBeforeResult(result: ResultInterface): Promise<void> {
        return;
    }

    private async _result(result: ResultInterface) {
        debug('lifecycle: before result');
        const _result = await this._onBeforeResult(result);
        if (_result !== undefined) result = _result;

        debug('lifecycle: check result');
        if (this._checkResult(result)) {
            result = await this.sendResultAsMessage(result);
        }

        debug('lifecycle: after result');
        await this._onAfterResult(result);

        return result;
    }

    async onAfterResult(result: ResultInterface): Promise<void> {
        await this.triggerStackDispatch();
    }

    async onDestroy(): Promise<void> {}
    // #endregion

    // #region result info
    prepareResultInfoFn(config) {
        if (config === false || config === 0) return [];

        const resultInfoFn = isArray(config) ? config : [config];
        return map(resultInfoFn, (info) => {
            if (!isString(info)) return info;

            return {
                fn: info,
            };
        });
    }

    private async _resultInfoFn(result: ResultInterface) {
        if (result?.statusUid !== StageStatusEnum.DONE) return;
        const resultInfoFn = this.prepareResultInfoFn(this.stageConfig.config.resultInfoFn || '_resultInfo');

        if (resultInfoFn.length > 0) {
            if (!result.info) result.info = {};
            for (const fnConfig of resultInfoFn) {
                if (typeof this[fnConfig.fn] === 'undefined') continue;

                const fnResult = typeof this[fnConfig.fn] === 'function' ? await this[fnConfig.fn]() : this[fnConfig.fn];
                if (fnResult === undefined || fnResult === null) continue;

                const key = fnConfig.key || !isArray(fnResult) ? fnConfig.key : fnResult[0];
                const value = fnConfig.key || !isArray(fnResult) ? fnResult : fnResult[1];

                if (key) {
                    result.info[key] = typeof value === 'object' ? value : !!value;
                } else if (typeof value === 'object') {
                    result.info = { ...result.info, ...(value || {}) };
                } else {
                    throw new WorkerError('Invalid resultInfoFn config. Key couldnt be defined', StageStatusEnum.FAILED);
                }
            }
        }
    }

    async _resultInfo(): Promise<any> {
        return {};
    }
    // #endregion

    async execute(): Promise<ResultInterface | null> {
        debug('stage.builder execute()', this.stageUid);
        return { statusUid: StageStatusEnum.DONE };
    }

    async findCurrentLastStageExecution() {
        try {
            const index = this.getIndex();
            if (this.body.mockStageExecution || this.body.options._pureExecution) return this.mockStageExecution();
            // const stageExecution = await this._findCurrentLastExecution();
            const { stageExecution, error } = await this._findCurrentNonFailedLastStageExecution();

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
        const stageExecution = defaultsDeep(mock, {
            moduleExecution: {
                date: new Date().toISOString(),
                data: {
                    options: {},
                    config: {},
                },
            },
            moduleExecutionId: 0,
            stageConfigId: 0,
            data: {},
            statusUid: StageStatusEnum.ASYNC,
        });

        stageExecution.moduleExecution.date = formatExecDate(stageExecution.moduleExecution.date);
        return stageExecution;
    }

    omitInternalOptions() {
        return this._omitInternalOptions(this.stageExecution.data.options);
    }

    _omitInternalOptions(options) {
        return pickBy(options, (value, key) => {
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
    // #endregion

    // #region getters
    public getDefaultConfig() {
        return this.defaultConfig;
    }

    public getDefaultOptions() {
        return this.defaultOptions || {};
    }

    // used mainly into templates
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

    // #region worker name, version, file
    static _getWorker(stageConfig, project) {
        return stageConfig?.config?.worker || project?._config?.defaultWorker || StageGeneric._getDefaultWorker();
    }

    static _getWorkerVersion(stageConfig, project) {
        return stageConfig?.config?.version || project?._config?.defaultVersion || '';
    }

    static _getWorkerFile(stageConfig, project) {
        const worker = StageWorker._getWorker(stageConfig, project);
        const version = StageWorker._getWorkerVersion(stageConfig, project) + '';

        const file = [worker];
        if (version) {
            if (/[^0-9]/.test(version)) {
                throw new WorkerError('Invalid version format. Only major version format are allowed.', StageStatusEnum.FAILED);
            }
            file.push('v' + version);
        }

        const workerFile = file.join('_');
        return workerFile;
    }

    getWorker() {
        return StageWorker._getWorker(this.stageConfig, this.project);
    }

    getWorkerVersion() {
        return StageWorker._getWorkerVersion(this.stageConfig, this.project);
    }

    getWorkerFile() {
        return StageWorker._getWorkerFile(this.stageConfig, this.project);
    }

    getDefaultWorker() {
        return StageGeneric._getDefaultWorker();
    }
    // #endregion

    getRootDir() {
        return this.rootDir;
    }

    getStageDir() {
        return this.stageDir;
    }

    getService(Service): any {
        return new Service(this.uniqueId);
    }

    override getRetryAttempt(increaseByOne = true) {
        return super.getRetryAttempt(increaseByOne);
    }
    // #endregion

    // #region legacy code

    // @deprecated old name
    fowardInternalOptions() {
        return this.forwardInternalOptions();
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
        ExecutionInfoMixin,
        StagesMixin {}

applyMixins(StageWorker, [LifeCycleMixin, DynamicWorkerMixin, InjectionMixin, DateMixin, PathMixin, SecretsMixin, StagesMixin]);
