import { uniqueId, indexOf, size, lastIndexOf, defaultsDeep } from 'lodash';
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
import { SnapshotMixin } from './mixins/snapshot.mixin';
import { ExecutionInfoMixin } from './mixins/system/executionInfo';
import { ForwardedMixin, ForwardedResultsMixin } from './mixins/system/forwarded';

export const worflowEventName = 'm0/workflow';

export abstract class StageGeneric {
    static defaultWorker = 'index';
    static getSolutions;

    readonly worflowEventName = worflowEventName;

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

    get isFakeResult() {
        return this.fakeResult || !!this.stageExecution?.data?.options?.fakeResult;
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
        const { events } = this._getSolutions();
        return this._sendEventMessage(_name, body, events);
    }

    // #region queueprefix
    getDefaultPrefix() {
        const { events: defaultEvents } = this._getSolutions();
        return defaultEvents.getPrefix();
    }

    _setBodyQueuePrefix(name, body) {
        const defaultPrefix = this.getDefaultPrefix();
        const workerPrefix = body.queuePrefix || defaultPrefix;
        const m0Prefix = body.m0QueuePrefix || defaultPrefix;

        const isMessageToM0 = this._isMessageToM0(name);
        const diffPrefix = workerPrefix !== m0Prefix;

        delete body.m0QueuePrefix;
        if (!diffPrefix) {
            delete body.queuePrefix;
        } else if (!isMessageToM0) {
            body.queuePrefix = workerPrefix;
            body.m0QueuePrefix = m0Prefix;
        }

        return { body, prefix: workerPrefix, m0Prefix };
    }

    _isMessageToM0(name) {
        return name === this.worflowEventName;
    }

    _processQueuePrefixes(name, body) {
        const { prefix, m0Prefix } = this._setBodyQueuePrefix(name, body);

        let sendPrefix = prefix;
        const isMessageToM0 = this._isMessageToM0(name);
        if (isMessageToM0) {
            sendPrefix = m0Prefix;
        }

        return { sendPrefix, prefix, m0Prefix };
    }
    // #endregion

    async _sendEventMessage(_name, body, events) {
        // events instance is not passed along. why?
        // worker will operate with only one prefix
        // the one that is set into env or the one received inside the body
        const { sendPrefix } = this._processQueuePrefixes(_name, body);
        return events.sendToQueue(_name, body, { prefix: sendPrefix });
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
            stageUid,
            executionUid,
            ...root,
            // cannot be replaced
            queuePrefix: this.body.queuePrefix || '',
            m0QueuePrefix: this.body.m0QueuePrefix || '',
        };

        // is forced transaction empty
        const forcedEmptyTransactionUid = !_root.transactionUid;
        if (forcedEmptyTransactionUid) {
            const parentTransactionUid = this.transactionUid;
            options = defaultsDeep(
                {
                    moduleExecutionData: {
                        parentTransactionUid,
                    },
                },
                options,
            );
        }

        return {
            ..._root,
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

    _prepareRootParams(params: any) {
        if (!size(params)) return params;
        if (params._parentTransaction) {
            params.transactionUid = this.moduleExecution.data.parentTransactionUid;
            if (!params.transactionUid) throw new Error('Parent transactionUid not found');
            delete params._parentTransaction;
        }
        return params;
    }

    buildTriggerStageBody(stageUidAndExecutionUid_, options: any = {}, config: any = {}, root: any = {}) {
        let stageUidAndExecutionUid = this._prepareStageUidAndExecutionUid(stageUidAndExecutionUid_);
        root = this._prepareRootParams(root);

        const refData: any = {};
        // repasse do parentTransactionUid para outro modulo
        if ('parentTransactionUid' in this.moduleExecution.data) {
            const parentTransactionUid = this.moduleExecution.data.parentTransactionUid;
            const triggeredModuleUid = stageUidAndExecutionUid.split('/')[0];

            const isTransactionUidForcedBlank = 'transactionUid' in root && root.transactionUid === '';
            // reenvia o parentTransactionUid para o modulo seguinte dentro da mesma transaction
            if (this.moduleUid !== triggeredModuleUid && !isTransactionUidForcedBlank) {
                refData.moduleExecutionData = {
                    parentTransactionUid,
                };
            }
        }

        options = defaultsDeep(
            {
                _calledByStage: this.stageUid,
            },
            options,
            refData,
        );

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

export interface StageGeneric
    extends StageStructureProperties,
        ConfigMixin,
        StatusMixin,
        RetryMixin,
        MultipleExecutionStageMixin,
        SnapshotMixin,
        ExecutionInfoMixin,
        ForwardedMixin,
        ForwardedResultsMixin {}

applyMixins(StageGeneric, [
    ConfigMixin,
    StatusMixin,
    RetryMixin,
    MultipleExecutionStageMixin,
    SnapshotMixin,
    ExecutionInfoMixin,
    ForwardedMixin,
    ForwardedResultsMixin,
]);
