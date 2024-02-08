import { uniqueId, result, indexOf, size } from 'lodash';
import { applyMixins } from 'node-labs/lib/utils/mixin';

import { ModuleExecutionInterface } from '../../interfaces/moduleExecution.interface';
import { ProjectInterface } from '../../interfaces/project.interface';
import { ModuleConfigInterface } from '../../interfaces/moduleConfig.interface';
import { StageConfigInterface } from '../../interfaces/stageConfig.interface';
import { StageExecutionInterface } from '../../interfaces/stageExecution.interface';
import { StageStructureProperties } from '../../interfaces/stageParts.interface';
import { StageStatusEnum } from '../../types/stageStatus.type';
import { StageExecutionFindError } from '../../types/stageExecution';

import { StageExecutionProvider } from '../../providers/stageExecution.provider';

import { ConfigMixin } from './mixins/system/config.mixin';
import { StatusMixin } from './mixins/system/status.mixin';
import { RetryMixin } from './mixins/system/retry.mixin';
import { MultipleExecutionStageMixin } from './mixins/system/multipleExecution.mixin';

export abstract class StageGeneric {
    static defaultWorker = 'index';
    static getSolutions;

    readonly worflowEventName = 'm0/workflow';

    uniqueId: string;
    body;

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
        const index =
            this.stageExecution && !isNaN(this.stageExecution?.data?.index) ? this.stageExecution?.data?.index : this.body.options.index;
        return index === undefined || index === null ? -1 : +index;
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

    async _findLastExecution() {
        return await StageExecutionProvider.findByTransactionAndModuleAndIndex(
            this.transactionUid,
            this.stageConfig.stageUid,
            this.getExecutionUid(),
            this.getIndex(),
        );
    }

    async _findNonFailedLastStageExecution() {
        // motivation to find the last one based on uid:
        // to make possible to work with parallel processes (split / child)
        const stageExecution = await this._findLastExecution();

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

    buildStageBody(stageUidAndExecutionUid, options: any = {}) {
        const { stageUid, executionUid } = this.separateStageUidAndExecutionUid(stageUidAndExecutionUid);
        return {
            projectUid: this.projectUid,
            transactionUid: this.transactionUid,
            date: this.moduleExecution.date,
            stageUid,
            executionUid,
            options,
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

    buildTriggerStageBody(stageUidAndExecutionUid_, options: any = {}) {
        let stageUidAndExecutionUid = this._prepareStageUidAndExecutionUid(stageUidAndExecutionUid_);

        options = {
            ...options,
            _calledByStage: this.stageUid,
        };

        stageUidAndExecutionUid = this.fowardExecutionUid(stageUidAndExecutionUid);
        return this.buildStageBody(stageUidAndExecutionUid, options);
    }
}

export interface StageGeneric extends StageStructureProperties, ConfigMixin, StatusMixin, RetryMixin, MultipleExecutionStageMixin {}

applyMixins(StageGeneric, [ConfigMixin, StatusMixin, RetryMixin, MultipleExecutionStageMixin]);
