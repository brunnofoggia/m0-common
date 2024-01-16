import { isNumber, uniqueId, size, indexOf, omit, defaultsDeep, pickBy, bind, defaults } from 'lodash';
import _debug from 'debug';
const debug = _debug('worker:stage');

import { exitRequest } from 'node-common/dist/utils/errors';
import { getDateForTimezone } from 'node-common/dist/utils';
import { applyMixins } from 'node-common/dist/utils/mixin';

import { BodyInterface } from '../../interfaces/body.interface';
import { ResultInterface } from '../../interfaces/result.interface';

import { StageStatusEnum } from '../../types/stageStatus.type';
import { Domain } from '../../types/domain.type';
import { ERROR } from '../../types/error.type';
import { WorkerError } from './error';

import { StageExecutionProvider } from '../../providers/stageExecution.provider';

import { importMixin } from '../../utils/importWorker';
import { StageGeneric } from './stage.generic';

export class StageWorker extends StageGeneric {
    static getSolutions;
    static defaultWorker = 'index';
    public fakeResult = false;
    protected readonly worflowEventName = 'm0/workflow';
    protected defaultConfig: any = {};
    protected defaultOptions: any = {};

    protected startedAt: string;
    protected body: BodyInterface;

    protected stageExecutionMocked = false;

    protected rootDir: string;
    protected moduleDir: string;
    protected stageDir: string;

    protected moduleDomain: any = {};
    protected stageDomain: any = {};

    protected _set(options) {
        super._set(options);
        this.setDirs();
    }

    protected getProjectUid() {
        return this.moduleConfig.projectUid || this.project.uid;
    }

    protected setDirs() {
        this.rootDir = [this.getProjectUid(), this.transactionUid].join('/');
        this.moduleDir = [this.rootDir, this.moduleConfig.moduleUid].join('/');
        this.stageDir = [this.rootDir, this.stageConfig.stageUid].join('/');
    }

    protected async checkExecution() {
        if (!this.stageExecution) exitRequest(ERROR.NO_STAGE_EXEC_DATA);
    }

    protected async __debug(...args) {
        if (!this.fakeResult) {
            debug(...args);
        }
    }

    public async initialize(uniqueId: string): Promise<ResultInterface> {
        this.__debug('-------------------------\ninitialize');
        this.__debug('set unique id', uniqueId);
        this.setUniqueId(uniqueId);
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
            if (this.checkResult(result)) {
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

    protected async _execute(): Promise<ResultInterface | null> {
        await this.checkExecution();
        let result;

        try {
            this.startedAt = new Date().toISOString();
            debug('on initialize');
            await this._onInitialize();

            debug('execute');
            result = await this.execute();
        } catch (error) {
            this.logError(error);
            result = this.buildExecutionError(error);
        }

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

    protected async execute(): Promise<ResultInterface | null> {
        console.log('stage.builder execute()', this.stageUid);
        return { statusUid: StageStatusEnum.DONE };
    }

    public async result(result: ResultInterface): Promise<ResultInterface> {
        try {
            result.statusUid = result.statusUid || StageStatusEnum.UNKNOWN;
            result.startedAt = this.startedAt;

            // runs before trigger result to catch errors
            result._options?.after && (await result._options.after());
        } catch (error) {
            this.logError(error);
            result = this.buildExecutionError(error);
        }

        await this.triggerResult(result);
        return result;
    }

    protected async findLastStageExecution() {
        try {
            if (this.body.mockStageExecution) return this.mockStageExecution();
            const stageExecution = await StageExecutionProvider.findByTransactionAndModuleAndIndex(
                this.transactionUid,
                this.stageConfig.stageUid,
                this.body.options.index,
            );

            if (!stageExecution || !size(stageExecution)) {
                throw new WorkerError(
                    `stageExecution not found for
                transactionUid:${this.transactionUid} , stageUid: ${this.stageConfig?.stageUid} , index: ${this.body.options.index}
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
            transactionUid:${this.transactionUid} , stageUid: ${this.stageConfig?.stageUid} , index: ${this.body.options.index}
            ("${JSON.stringify(stageExecution)}")`,
                StageStatusEnum.FAILED,
            );
        } catch (err) {
            debug(err);
            return null;
        }
    }

    protected async triggerStage(_name, body) {
        const { events } = await StageWorker.getSolutions();
        // const name = _name.replace(/\//g, '-');
        return events.sendToQueue(_name, body);
    }

    protected async triggerResult(result: ResultInterface) {
        const index = this.stageExecution.data.index;
        debug(`result:`, result, '; stage:', this.stageUid, '; index: ', index);
        if (typeof result === 'undefined' || result === null || this.stageExecutionMocked) return;

        result.statusUid = result.statusUid || StageStatusEnum.UNKNOWN;
        // avoid infinity loop when waiting multiple child process
        // but with this waiting status never is saved
        // if (result.status === StageStatusEnum.WAITING) return;

        const { events } = await StageWorker.getSolutions();
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

    protected prepareConfig(_config = null) {
        _config === null && (_config = this.stageConfig.config);
        this.stageConfig.config = defaultsDeep({}, this.stageExecution.data, _config, this.getDefaultConfig());
        return this.stageConfig.config;
    }

    protected prepareOptions(_options = null) {
        _options === null && (_options = this.stageConfig.options);
        this.stageConfig.options = defaultsDeep({}, this.stageExecution.data, _options, this.getDefaultOptions());
        return this.stageConfig.options;
    }

    protected mockStageExecution() {
        this.stageExecutionMocked = true;
        const mock = typeof this.body.mockStageExecution === 'object' ? this.body.mockStageExecution : {};
        return defaultsDeep(mock, {
            moduleExecutionId: 0,
            stageConfigId: 0,
            data: {},
            statusUid: StageStatusEnum.ASYNC,
        });
    }

    protected fowardInternalOptions() {
        return pickBy(this.stageExecution.data, (value, key) => {
            return /^_[a-zA-Z]/.test(key);
        });
    }

    omitInternalOptions() {
        return pickBy(this.stageExecution.data, (value, key) => {
            return !/^_[a-zA-Z]/.test(key);
        });
    }

    /** options */

    isStageOptionActivated(configName) {
        return this['_isActivated']('stageConfig', configName, 'options');
    }

    isStageOptionDeactivated(configName) {
        return this['_isDeactivated']('stageConfig', configName, 'options');
    }

    isModuleOptionActivated(configName) {
        return this['_isActivated']('moduleConfig', configName, 'options');
    }

    isModuleOptionDeactivated(configName) {
        return this['_isDeactivated']('moduleConfig', configName, 'options');
    }

    isInheritedOptionActivated(configName) {
        return this['_isActivated']('stageConfig', configName, 'options') || this['_isActivated']('moduleConfig', configName, 'options');
    }

    isInheritedOptionDeactivated(configName) {
        return this['_isDeactivated']('stageConfig', configName, 'options') || this['_isDeactivated']('moduleConfig', configName, 'options');
    }

    async getSecret(name: string, basePath: any = null) {
        name = name.replace(/^\//, '').replace(/\/$/, '');
        const { secrets } = await StageWorker.getSolutions();

        if (this.body.options.clearSecrets || !!process.env.IS_TS_NODE) secrets.clearCache();

        const env = process.env.NODE_ENV || 'dev';
        const path = ['', env];
        basePath === null && (basePath = [this.getProjectUid()].join('/'));
        path.push(basePath);
        path.push(name);

        const secretPath = path.join('/');
        const value = await secrets.getSecretValue(secretPath);
        if (!value) throw new WorkerError(`secret value not found for ${secretPath}`, StageStatusEnum.FAILED);

        return value;
    }

    async getGlobalSecret(name: string, basePath: any = null) {
        basePath === null && (basePath = ['mx'].join('/'));
        return await this.getSecret(name, basePath);
    }

    async getModuleSecret(name: string, basePath: any = null) {
        basePath === null && (basePath = [this.getProjectUid(), this.moduleUid].join('/'));
        return await this.getSecret(name, basePath);
    }

    async getStageSecret(name: string, basePath: any = null) {
        basePath === null && (basePath = [this.getProjectUid(), this.stageUid].join('/'));
        return await this.getSecret(name, basePath);
    }

    /* execution info */
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

    /* date */
    getTimezoneOffset(_customTimezoneOffset = null) {
        const timezoneOffset = !_customTimezoneOffset && _customTimezoneOffset !== 0 ? this.project?._config?.timezoneOffset : _customTimezoneOffset;
        return +(timezoneOffset || 0);
    }

    getTimezoneString(_customTimezoneOffset = null, addMinutes = false) {
        const timezoneOffset = this.getTimezoneOffset(_customTimezoneOffset);
        const timezoneData = (timezoneOffset + '').split('');
        timezoneData[1] = timezoneData[1].padStart(2, '0');
        const timezoneString = timezoneData.join('');
        return timezoneString + (addMinutes ? ':00' : '');
    }

    getDate(date = undefined, keepLocalTime = false, _customTimezoneOffset = null) {
        (typeof date === 'undefined' || date === null) && (date = this.moduleExecution?.date || new Date());
        const timezoneOffset = this.getTimezoneOffset(_customTimezoneOffset);
        return getDateForTimezone(timezoneOffset, date, keepLocalTime);
    }

    // getters
    get() {
        return {
            body: this.body,
            transactionUid: this.transactionUid,
            moduleConfig: this.moduleConfig,
            stageConfig: this.stageConfig,
            stageExecution: this.stageExecution,
            project: this.project,
            rootDir: this.rootDir,
            stageDir: this.stageDir,
        };
    }

    extractMethods() {
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

    getStageParts() {
        return defaults(this.extractMethods(), this.get());
    }

    static _getWorker(stageConfig, project) {
        return stageConfig.config.worker || project._config.defaultWorker || StageWorker.defaultWorker;
    }

    getWorker() {
        return StageWorker._getWorker(this.stageConfig, this.project);
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

    /* lifecycle methods */
    protected async _onInitialize(): Promise<void> {
        try {
            await this.onInitialize();
        } catch (error) {
            debug('error on initialize');
            throw error;
        }
    }

    public async onInitialize(): Promise<void> {
        return;
    }

    protected async _onDestroy(): Promise<void> {
        try {
            await this.onDestroy();
        } catch (error) {
            debug('error on destroy');
            this.logError(error);
        }
    }

    public async onDestroy(): Promise<void> {
        return;
    }

    /* domains */
    async _loadDomains(domains, path, type: Domain) {
        const stageParts = this.getStageParts();
        for (const name of domains) {
            const Domain = await this.loadWorkerClass(name, path);
            const instance = !Domain.getInstance ? new Domain() : await Domain.getInstance(stageParts);
            if (instance.setStageParts) instance.setStageParts(stageParts);
            this[type + 'Domain'][name] = instance;
        }
    }

    async loadModuleDomains(domains) {
        const path = this.buildWorkerClassModulePath();
        await this._loadDomains(domains, path, Domain.module);
    }

    async loadStageDomains(domains) {
        const path = this.buildWorkerClassStagePath();
        await this._loadDomains(domains, path, Domain.stage);
    }

    /* mixins */
    async loadMixins(mixins, _class) {
        const path = this.buildWorkerClassStagePath();
        for (const name of mixins) {
            const Mixin = await this.loadWorkerClass(name, path);
            applyMixins(_class, [Mixin]);
        }
    }

    buildWorkerClassStagePath() {
        return `modules/${this.moduleUid}/stages/${this.stageName}/domain`;
    }

    buildWorkerClassModulePath() {
        return `modules/${this.moduleUid}/domain`;
    }

    async loadWorkerClass(name, path = null) {
        !path && (path = this.buildWorkerClassStagePath());
        const worker = this.getWorker();
        return this._loadWorkerClass(name, path, worker);
    }

    async _loadWorkerClass(name, path, worker) {
        // worker may be the name of some client located at stageConfig.config.worker
        try {
            return await importMixin(path, name, worker);
        } catch (err) {
            if (worker != StageWorker.defaultWorker) {
                // if worker is the name of a client, but file is not found
                // get default instead
                return this._loadWorkerClass(name, path, StageWorker.defaultWorker);
            }
            throw new Error(`class "${name}" not found`);
        }
    }

    getRetryAttempt(increaseByOne = true) {
        return super.getRetryAttempt(increaseByOne);
    }
}
