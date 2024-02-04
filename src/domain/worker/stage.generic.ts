import { ModuleExecutionInterface } from '../../interfaces/moduleExecution.interface';
import { ProjectInterface } from '../../interfaces/project.interface';
import { ModuleConfigInterface } from '../../interfaces/moduleConfig.interface';
import { StageConfigInterface } from '../../interfaces/stageConfig.interface';
import { StageExecutionInterface } from '../../interfaces/stageExecution.interface';

import { uniqueId } from 'lodash';
import { applyMixins } from 'node-labs/lib/utils/mixin';
import { ConfigMixin } from './mixins/system/config.mixin';
import { StatusMixin } from './mixins/system/status.mixin';
import { RetryMixin } from './mixins/system/retry.mixin';
import { StageStructureProperties } from 'interfaces/stageParts.interface';

export abstract class StageGeneric {
    static defaultWorker = 'index';
    readonly worflowEventName = 'm0/workflow';

    uniqueId: string;
    body;

    transactionUid: string;
    moduleUid: string;
    stageUid: string;
    stageName: string;

    moduleExecution: ModuleExecutionInterface;
    moduleConfig: ModuleConfigInterface;
    stageConfig: StageConfigInterface;
    project: ProjectInterface;

    stageExecution: StageExecutionInterface;

    executionInfo: any = {};

    constructor(options) {
        this._set(options);
    }

    _set({ transactionUid, moduleUid, stageUid, stageName, moduleConfig, stageConfig, body }) {
        this.transactionUid = transactionUid;
        this.moduleUid = moduleUid;
        this.stageUid = stageUid;
        this.stageName = stageName;
        this.moduleConfig = moduleConfig;
        this.stageConfig = stageConfig;
        this.body = body;

        this.project = this.moduleConfig.project;
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
        const index = !isNaN(this.stageExecution?.data?.index) ? this.stageExecution?.data?.index : this.body.options.index;
        return index === undefined || index === null ? -1 : +index;
    }

    _sendEventMessage(_name, body, events) {
        return events.sendToQueue(_name, body);
    }

    // getIndex(): string | number {
    //     const index = this.stageExecution?.data?.index !== undefined ? this.stageExecution?.data?.index : this.body.options.index;
    //     return index === undefined ? -1 : index;
    // }
}

export interface StageGeneric extends StageStructureProperties, ConfigMixin, StatusMixin, RetryMixin {}

applyMixins(StageGeneric, [ConfigMixin, StatusMixin, RetryMixin]);
