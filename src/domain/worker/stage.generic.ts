import _debug from 'debug';
const debug = _debug('worker:stage');
const essentialInfo = _debug('worker:stage:essential');
import { uniqueId, indexOf, size, defaultsDeep } from 'lodash';
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
import { SystemInterface } from '../../interfaces/result.interface';
import { WorkerError } from './error';
import { BodyInterface } from '../../interfaces/body.interface';

import { ConfigMixin } from './mixins/system/config.mixin';
import { StatusMixin } from './mixins/system/status.mixin';
import { RetryMixin } from './mixins/system/retry.mixin';
import { MultipleExecutionStageMixin } from './mixins/system/multipleExecution.mixin';
import { SnapshotMixin } from './mixins/snapshot.mixin';
import { ExecutionInfoMixin } from './mixins/system/executionInfo';
import { ForwardedMixin, ForwardedResultsMixin } from './mixins/system/forwarded';
import { MessageMixin } from './mixins/system/message.mixin';
import { StackTriggerMixin } from './mixins/system/stackTrigger.mixin';
import { ResultMixin } from './mixins/system/result.mixin';
import { TemplateMixin } from './mixins/system/template.mixin';
import { DateMixin } from './mixins/system/date.mixin';
import { PathMixin } from './mixins/system/path.mixin';
import { SecretsMixin } from './mixins/system/secrets.mixin';
import { DatabaseMixin } from './mixins/system/database.mixin';
import { m0RequestErrorHandler } from '../../utils/request';

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
    system: Partial<SystemInterface> = {};

    executionInfo: any = {};
    executionError: WorkerError;
    executionStatusUid: any = null;

    stackTriggers: Array<BodyInterface> = [];
    fakeResult = false;
    stageExecutionMocked = false;

    private _stageConfig_options;
    private _stageConfig_config;
    private _stageConfig_options_inputed = {};
    private _stageConfig_config_inputed = {};

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
        return this.fakeResult || !!this.stageExecution?.data?.config?.fakeResult;
    }

    abstract initialize(uniqueId: string);

    // #region getters
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

    getEnv() {
        return process.env.NODE_ENV || 'dev';
    }

    getFakeEnv() {
        return process.env.FAKE_ENV || this.getEnv();
    }
    // #endregion

    async _findCurrentLastExecution() {
        try {
            return await StageExecutionProvider.findByTransactionAndModuleAndIndex(
                this.transactionUid,
                this.stageConfig.stageUid,
                this.getExecutionUid(),
                this.getIndex(),
            );
        } catch (error) {
            m0RequestErrorHandler(error);
        }
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

    logError(error: any) {
        let errorMessage, errorStack;
        if (typeof error === 'string') {
            errorMessage = error;
        } else {
            errorMessage = error.message;
            errorStack = error.stack;
        }

        essentialInfo('stage info:', this.stageDir);
        essentialInfo('error message:', errorMessage);
        if (errorStack) {
            essentialInfo('stack:\n');
            console.log(errorStack);
        }
    }

    // #region trigger.mixin soon
    _prepareRootParams(params: any) {
        if (!size(params)) return params;
        if (params._parentTransaction) {
            params.transactionUid = this.moduleExecution.data.parentTransactionUid;
            if (!params.transactionUid) throw new Error('Parent transactionUid not found');
            delete params._parentTransaction;
        }
        return params;
    }

    async buildTriggerStageBody(stageUidAndExecutionUid_, options: any = {}, config: any = {}, root: any = {}) {
        let stageUidAndExecutionUid = await this._prepareStageUidAndExecutionUid(stageUidAndExecutionUid_);
        root = this._prepareRootParams(root);

        const isTransactionUidForcedBlank = 'transactionUid' in root && root.transactionUid === '';
        const refData: any = {};
        // repasse do parentTransactionUid para outro modulo
        if ('parentTransactionUid' in this.moduleExecution.data) {
            const parentTransactionUid = this.moduleExecution.data.parentTransactionUid;
            const triggeredModuleUid = stageUidAndExecutionUid.split('/')[0];

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

        // to ensure date from past day to be kept when triggering new transactions or transactions of past days in another modules
        root.date = this.moduleExecution.date;

        stageUidAndExecutionUid = this.fowardExecutionUid(stageUidAndExecutionUid);
        return await this.buildStageBody(stageUidAndExecutionUid, options, config, root);
    }
    // #endregion
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
        ForwardedResultsMixin,
        MessageMixin,
        StackTriggerMixin,
        ResultMixin,
        DateMixin,
        PathMixin,
        TemplateMixin,
        SecretsMixin,
        DatabaseMixin {}

applyMixins(StageGeneric, [
    ConfigMixin,
    StatusMixin,
    RetryMixin,
    MultipleExecutionStageMixin,
    SnapshotMixin,
    ExecutionInfoMixin,
    ForwardedMixin,
    ForwardedResultsMixin,
    MessageMixin,
    StackTriggerMixin,
    ResultMixin,
    DateMixin,
    PathMixin,
    TemplateMixin,
    SecretsMixin,
    DatabaseMixin,
]);
