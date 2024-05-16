import { uniqueId, indexOf, size, lastIndexOf } from 'lodash';
import { applyMixins } from 'node-labs/lib/utils/mixin';

import { ModuleExecutionInterface } from '../../interfaces/moduleExecution.interface';
import { ProjectInterface } from '../../interfaces/project.interface';
import { ModuleConfigInterface } from '../../interfaces/moduleConfig.interface';
import { StageConfigInterface } from '../../interfaces/stageConfig.interface';
import { StageExecutionInterface } from '../../interfaces/stageExecution.interface';
import { StageStructureProperties } from '../../interfaces/stageParts.interface';
import { StageStatusEnded, StageStatusEnum, StageStatusError, StageStatusProcess } from '../../types/stageStatus.type';
import { StageExecutionFindError } from '../../types/stageExecution';

import { StageExecutionProvider } from '../../providers/stageExecution.provider';

import { ConfigMixin } from './mixins/system/config.mixin';
import { StatusMixin } from './mixins/system/status.mixin';
import { RetryMixin } from './mixins/system/retry.mixin';
import { MultipleExecutionStageMixin } from './mixins/system/multipleExecution.mixin';
import { WorkerError } from './error';
import { BodyInterface } from '../../interfaces/body.interface';

export abstract class StageGeneric {
    static defaultWorker = 'index';
    static getSolutions;

    readonly worflowEventName = 'm0/workflow';

    uniqueId: string;
    body: BodyInterface;

    projectUid: string;
    transactionUid: string;
    moduleUid: string;
    stageUid: string;
    executionUid: string;
    stageName: string;

    moduleExecution: ModuleExecutionInterface;
    moduleConfig: ModuleConfigInterface;
    stageConfig: StageConfigInterface;
    project: ProjectInterface;

    stageExecution: StageExecutionInterface;

    executionInfo: any = {};
    executionError: WorkerError;
    executionStatusUid: any = null;
    fakeResult = false;

    constructor(options) {
        this._set(options);
    }

    _set({ projectUid = '', transactionUid, moduleUid, stageUid, executionUid, stageName, moduleConfig, stageConfig, body }) {
        this.transactionUid = transactionUid;
        this.moduleUid = moduleUid;
        this.stageUid = stageUid;
        this.executionUid = executionUid;
        this.stageName = stageName;
        this.moduleConfig = moduleConfig;
        this.stageConfig = stageConfig;
        this.body = body;

        this.project = this.moduleConfig.project;
        this.projectUid = projectUid || this.moduleConfig.projectUid || this.project.uid;
    }

    _getSolutions() {
        return StageGeneric.getSolutions();
    }

    _setUniqueId(_uniqueId = '') {
        !_uniqueId && (_uniqueId = [uniqueId('worker:'), new Date().toISOString()].join(':'));
        this.uniqueId = _uniqueId;
    }

    _checkResult(result) {
        return !!result;
    }

    abstract initialize(uniqueId: string);

    static _getDefaultWorker() {
        return StageGeneric.defaultWorker;
    }

    getBody() {
        return this.body;
    }

    getTransactionUid() {
        return this.transactionUid;
    }

    getProjectUid(): string {
        return this.projectUid;
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

    getIndex(): number {
        const bodyIndex = this.body.options?.index;
        const stageExecutionIndex =
            size(this.stageExecution?.data) > 0
                ? !isNaN(this.stageExecution.data.options?.index)
                    ? this.stageExecution.data.options.index
                    : !isNaN(this.stageExecution.data.index)
                    ? this.stageExecution.data.index
                    : undefined
                : undefined;

        const index = stageExecutionIndex || bodyIndex;
        return index === undefined || index === null || index === false ? -1 : +index;
    }

    getEnv() {
        return process.env.NODE_ENV || 'dev';
    }

    getFakeEnv() {
        return process.env.FAKE_ENV || this.getEnv();
    }

    // getIndex(): string | number {
    //     const index = this.stageExecution?.data?.index !== undefined ? this.stageExecution?.data?.index : this.body.options.index;
    //     return index === undefined ? -1 : index;
    // }

    getExecutionUid() {
        const executionUid =
            this.stageExecution && this.stageExecution?.system?.executionUid
                ? this.stageExecution?.system?.executionUid
                : this.executionUid;
        return executionUid || '';
    }

    async triggerStageToDefaultProvider(_name, body) {
        const { events } = await StageGeneric.getSolutions();
        return this._sendEventMessage(_name, body, events);
    }

    _sendEventMessage(_name, body, events) {
        return events.sendToQueue(_name, body);
    }

    async _findCurrentLastExecution() {
        return await StageExecutionProvider.findByTransactionAndModuleAndIndex(
            this.transactionUid,
            this.stageConfig.stageUid,
            this.getExecutionUid(),
            this.getIndex(),
        );
    }

    async _findCurrentNonFailedLastStageExecution() {
        // motivation to find the last one based on uid:
        // to make possible to work with parallel processes (split / child)
        const stageExecution = await this._findCurrentLastExecution();

        if (!stageExecution || !size(stageExecution)) {
            return { stageExecution: undefined, error: StageExecutionFindError.NOT_FOUND };
        }

        if (
            stageExecution?.statusUid &&
            indexOf(
                [
                    // StageStatusEnum.DONE,
                    StageStatusEnum.FAILED,
                    StageStatusEnum.UNKNOWN,
                ],
                stageExecution.statusUid,
            ) === -1
        ) {
            return { stageExecution, error: StageExecutionFindError.NONE };
        }

        return { stageExecution: undefined, error: StageExecutionFindError.FAILED };
    }

    buildStageBody(stageUidAndExecutionUid, options: any = {}, config: any = {}, root: any = {}) {
        const { stageUid, executionUid } = this.separateStageUidAndExecutionUid(stageUidAndExecutionUid);
        const _root = {
            projectUid: this.projectUid,
            transactionUid: this.transactionUid,
            date: this.moduleExecution.date,
            ...root,
        };

        return {
            ..._root,
            stageUid,
            executionUid,
            options,
            config,
        };
    }

    buildTriggerStageResultBody(options: any = {}, result: any = {}) {
        let stageUidAndExecutionUid = this.stageUid;
        options = {
            index: this.getIndex(),
        };

        stageUidAndExecutionUid = this.joinStageUidWithCurrentExecutionUid(stageUidAndExecutionUid);
        return {
            ...this.buildStageBody(stageUidAndExecutionUid, options),
            result,
        };
    }

    buildTriggerStageBody(stageUidAndExecutionUid_, options: any = {}, config: any = {}, root: any = {}) {
        let stageUidAndExecutionUid = this._prepareStageUidAndExecutionUid(stageUidAndExecutionUid_);

        options = {
            ...options,
            _calledByStage: this.stageUid,
        };

        stageUidAndExecutionUid = this.fowardExecutionUid(stageUidAndExecutionUid);
        return this.buildStageBody(stageUidAndExecutionUid, options, config, root);
    }

    isStatusProcessing(statusUid) {
        return lastIndexOf(StageStatusProcess, statusUid) >= 0;
    }

    // legacy
    isStatusAnError(statusUid) {
        return lastIndexOf(StageStatusError, statusUid) >= 0;
    }

    isStatusError(statusUid) {
        return lastIndexOf(StageStatusError, statusUid) >= 0;
    }

    isStatusEnded(statusUid) {
        return lastIndexOf(StageStatusEnded, statusUid) >= 0;
    }
}

export interface StageGeneric extends StageStructureProperties, ConfigMixin, StatusMixin, RetryMixin, MultipleExecutionStageMixin {}

applyMixins(StageGeneric, [ConfigMixin, StatusMixin, RetryMixin, MultipleExecutionStageMixin]);
