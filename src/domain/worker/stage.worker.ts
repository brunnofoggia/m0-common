import _ from 'lodash';
import _debug from 'debug';
const debug = _debug('app:workflow:stage');

import { StageExecutionProvider } from '../../providers/stageExecution.provider';
import { exitRequest } from 'node_common/dist/utils/errors';

import { StageStatusEnum } from '../../types/stageStatus.type';
import { ModuleConfigInterface } from '../../interfaces/moduleConfig.interface';
import { StageConfigInterface } from '../../interfaces/stageConfig.interface';
import { StageExecutionInterface } from '../../interfaces/stageExecution.interface';


import { BodyInterface } from '../../interfaces/body.interface';
import { ResultInterface } from '../../interfaces/result.interface';
import { ModuleExecutionInterface } from '../../interfaces/moduleExecution.interface';
import { ProjectInterface } from '../../interfaces/project.interface';
import { ERROR } from '../../types/error.type';

export class StageWorker {
    static getSolutions;
    protected readonly worflowEventName = 'm0/workflow';
    protected defaultConfig: any = {};

    protected body: BodyInterface;

    protected transactionUid: string;
    protected moduleUid: string;
    protected stageUid: string;
    protected stageName: string;

    protected moduleExecution: ModuleExecutionInterface;
    protected moduleConfig: ModuleConfigInterface;
    protected stageConfig: StageConfigInterface;
    protected project: ProjectInterface;

    protected stageExecution: StageExecutionInterface;
    protected stageExecutionMocked = false;

    protected rootDir = '';
    protected stageDir = '';

    private set({ transactionUid, moduleUid, stageUid, stageName, moduleConfig, stageConfig, body }) {
        this.transactionUid = transactionUid;
        this.moduleUid = moduleUid;
        this.stageUid = stageUid;
        this.stageName = stageName;
        this.moduleConfig = moduleConfig;
        this.stageConfig = stageConfig;
        this.body = body;
        this.project = this.moduleConfig.project;

        this.setDirs();
    }

    private setDirs() {
        this.rootDir = [this.moduleConfig.projectUid, this.transactionUid].join('/');
        this.stageDir = [this.rootDir, this.stageConfig.stageUid].join('/');
    }

    constructor(options) {
        this.set(options);
    }

    protected defaultOptions = {
        _attempts: 1,
        _triggerNextStage: 1,
        index: -1,
    };

    protected prepareOptions(): any {
        const options = this.body.options || {};

        _.each(this.defaultOptions, (value, key) => {
            !(key in options) && (options[key] = value);
        });

        return options;
    }

    protected async checkExecution() {
        if (!this.stageExecution)
            exitRequest(ERROR.NO_STAGE_EXEC_DATA);
    }

    public async initialize(): Promise<any> {
        this.stageExecution = await this.findLastStageExecution();
        this.moduleExecution = this.stageExecution.moduleExecution;

        const result = await this._execute();
        if (result !== null)
            await this.result(result);

        return { done: true };
    }

    protected async _execute(): Promise<ResultInterface | null> {
        await this.checkExecution();
        return await this.execute();
    }


    protected async execute(): Promise<ResultInterface | null> {
        console.log('stage.builder execute()', this.stageUid);
        return { statusUid: StageStatusEnum.DONE };
    }

    public async result(result: ResultInterface) {
        result.statusUid = result.statusUid || StageStatusEnum.UNKNOWN;
        await this.triggerResult(result);

        result._options?.after && (await result._options.after());
    }

    protected async findLastStageExecution() {
        if (this.body.mockStageExecution) return this.mockStageExecution();
        const stageExecution = await StageExecutionProvider.findByTransactionAndModuleAndIndex(
            this.transactionUid,
            this.stageConfig.stageUid,
            this.body.options.index
        );

        if (stageExecution?.statusUid &&
            _.indexOf(
                [
                    // StageStatusEnum.DONE,
                    StageStatusEnum.FAILED,
                    StageStatusEnum.UNKNOWN
                ],
                stageExecution.statusUid) === -1) {
            return stageExecution;
        }
    }

    protected async triggerStage(_name, body) {
        const { events } = await StageWorker.getSolutions();
        // const name = _name.replace(/\//g, '-');
        events.sendToQueue(_name, body);
    }

    protected async triggerResult(result: ResultInterface) {
        const index = this.stageExecution.data.index;
        debug(`result:`, result, '; stage:', this.stageUid, '; index: ', index);
        if (typeof result === 'undefined' || result === null || this.stageExecutionMocked)
            return;

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
                ..._.omit(result, '_options'),
                errorMessage: (result.errorMessage || '').split('\n')[0]
            }
        };

        events.sendToQueue(this.worflowEventName, body);
    }

    protected prepareConfig(_config) {
        return _.defaultsDeep(_config, this.defaultConfig);
    }

    protected mockStageExecution() {
        this.stageExecutionMocked = true;
        const mock = typeof this.body.mockStageExecution === 'object' ? this.body.mockStageExecution : {};
        return _.defaultsDeep(mock, {
            moduleExecutionId: 0,
            stageConfigId: 0,
            data: {},
            statusUid: StageStatusEnum.ASYNC,
        });
    }

    protected fowardInternalOptions() {
        return _.pickBy(this.stageExecution.data,
            (value, key) => {
                return /^_[a-zA-Z]/.test(key);
            }
        );
    }

    protected _isConfigActivated(configHolderKey, configName, configKey = 'config') {
        return this[configHolderKey][configKey][configName] === 1 ||
            this[configHolderKey][configKey][configName] === '1' ||
            this[configHolderKey][configKey][configName] === true;
    }

    public isStageConfigActivated(configName) {
        return this._isConfigActivated('stageConfig', configName);
    }

    public isStageConfigDeactivated(configName) {
        return !this._isConfigActivated('stageConfig', configName);
    }

    public isModuleConfigActivated(configName) {
        return this._isConfigActivated('moduleConfig', configName);
    }

    public isModuleConfigDeactivated(configName) {
        return !this._isConfigActivated('moduleConfig', configName);
    }

    public isProjectConfigActivated(configName) {
        return this._isConfigActivated('project', configName, '_config');
    }

    public isProjectConfigDeactivated(configName) {
        return !this._isConfigActivated('project', configName, '_config');
    }

    // getters
    public get() {
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

    public getBody() {
        return this.body;
    }

    public getTransactionUid() {
        return this.transactionUid;
    }

    public getModuleConfig() {
        return this.moduleConfig;
    }

    public getStageConfig() {
        return this.stageConfig;
    }

    public getStageExecution() {
        return this.stageExecution;
    }

    public getRootDir() {
        return this.rootDir;
    }

    public getStageDir() {
        return this.stageDir;
    }
}
