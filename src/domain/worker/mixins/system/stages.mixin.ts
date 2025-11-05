import { cloneDeep, defaultsDeep, filter, isArray, size, sortBy } from 'lodash';

import { StageExecutionProvider } from '../../../../providers/stageExecution.provider';
import { SnapshotProvider } from '../../../../providers/snapshot.provider';

import { PathMixin } from './path.mixin';
import { MultipleExecutionStageMixin } from './multipleExecution.mixin';
import { SnapshotMixin } from '../snapshot.mixin';
import { StackTriggerMixin } from './stackTrigger.mixin';
import { ForwardedMixin, ForwardedResultsMixin } from './forwarded';

export abstract class StagesMixin {
    parentStageConfig: any = {};
    abstract buildTriggerStageBody(stageUidAndExecutionUid_, options?: any, config?: any, root?: any): Promise<any>;
    abstract isLikeStageUid(stageUid: string): boolean;

    isStageStatus(status: string) {
        return this.stageExecution.statusUid === status;
    }

    // #region getters
    _getParentStage() {
        return this.stageConfig.config.parentStage;
    }

    _getCallbackStage() {
        return this.stageConfig.config.callbackStage;
    }

    _getNextStages() {
        return this.stageConfig.config.nextStage;
    }

    _getRequiredStages() {
        return this.stageConfig.config.requiredStage;
    }

    getPrevStage() {
        const prevStage = this.stageConfig.config.prevStage || this.stageExecution.data.options?._calledByStage;
        if (!prevStage) {
            throw new Error(
                'prevStage could not be determined. Please check the stageConfig.config.prevStage or provide into options._calledByStage',
            );
        }
        return prevStage;
    }

    getFirstPrevStage(): string {
        return this.getPrevStageList()[0];
    }

    getPrevStageList() {
        const prevStage_ = this.getPrevStage();
        return isArray(prevStage_) ? prevStage_ : [prevStage_];
    }

    getParentStage() {
        const parentStage =
            this.stageConfig.config.callbackStage || this._getParentStage() || this.stageExecution.data.options?._calledByStage;
        if (!parentStage) {
            throw new Error(
                'parentStage could not be determined. Please check the stageConfig.config.parentStage or provide into options._calledByStage or even maybe it should be provided at the request inside config.callbackStage',
            );
        }
        return parentStage;
    }

    async setParentStageConfig() {
        this.parentStageConfig = {};

        const parentStage = this.separateStageUidAndExecutionUid(this.getParentStage()).stageUid;
        if (parentStage) {
            if (!this.body.mockStageExecution) {
                this.parentStageConfig = await this.findStageConfig(parentStage);
            } else {
                this.parentStageConfig = await SnapshotProvider.getStageConfigFromSnapshot(parentStage, this.moduleConfig || {});
            }
        }
    }

    getParentStageDir() {
        const stageUid = this.replaceStageExecutionSplitter(this.getParentStage());
        return [this.rootDir, stageUid].join('/');
    }

    getChildStage() {
        return this.stageConfig.config.childStage || this.stageConfig.config.splitStage;
    }

    getRequiredStages(stageConfig) {
        const _requiredStages = stageConfig.config.requiredStage;
        return isArray(_requiredStages) ? _requiredStages : [_requiredStages];
    }

    getTriggeredRequiredStages(stageConfig) {
        const triggerRequiredStageConfig = stageConfig.config.triggerRequiredStage;
        if (!triggerRequiredStageConfig) return [];
        let triggeredRequiredStages = [];

        if (isArray(triggerRequiredStageConfig)) {
            triggeredRequiredStages = [...triggerRequiredStageConfig];
        }
        // if triggerRequiredStage is empty it means no stage is triggered
        else if (triggerRequiredStageConfig) {
            if (typeof triggerRequiredStageConfig === 'string') {
                triggeredRequiredStages.push(triggerRequiredStageConfig);
            } else {
                // trigger all required stages

                // no need because is applied later below
                // triggeredRequiredStages = [...this.getRequiredStagesWithForwardedExecutionUid(stageConfig)];

                triggeredRequiredStages = [...this.getRequiredStages(stageConfig)];
            }
        }

        return triggeredRequiredStages;
    }
    // #endregion

    // #region child stage
    async triggerChildStage(options: any = {}, config: any = {}, root: any = {}) {
        let stageUid = this.getChildStage() || root.stageUid;
        if (!stageUid || this.stageExecution.data.options?._triggerChildStage === 0) return;

        if (!isArray(stageUid)) {
            stageUid = [stageUid];
        }

        for (const stageUidItem of stageUid) {
            const body = await this.buildChildStageBody(options, config, { ...root, stageUid: stageUidItem });
            await this.addTriggerToStack(body);
        }
    }

    async getChildStageDefaultOptions(): Promise<any> {
        const defaultOptions = {
            index: this.getIndex(),
        };

        return defaultOptions;
    }

    async buildChildStageOptions(options: any = {}, root_: any = {}): Promise<any> {
        let childStageOptions = this._getTriggerParams(this.stageConfig.config.childStageOptions, root_.stageUid);
        // let rootChildStageOptions = defaultsDeep({}, this.stageConfig.config.childStageOptions || {});
        // if (root_.stageUid && rootChildStageOptions[root_.stageUid]) {
        //     childStageOptions = rootChildStageOptions[root_.stageUid];
        // }

        const _options = defaultsDeep(
            {},
            childStageOptions,
            options,
            await this.getChildStageDefaultOptions(),
            this.forwardInternalOptions(),
        );
        return this.setForwardedResultsToTrigger(_options);
    }

    async getChildStageDefaultConfig(): Promise<any> {
        const defaultConfig: any = {};
        const shouldCallback = !!this.stageConfig.config.childCallback;
        if (shouldCallback) {
            defaultConfig.callbackStage = this.buildCurrentStageUidAndExecutionUid();
            defaultConfig.callbackIndex = this.getIndex();
            defaultConfig.isSubProcess = 1;
        }

        return defaultConfig;
    }

    async getChildStageDefaultRoot(): Promise<any> {
        return {};
    }

    async buildChildStageConfig(config: any = {}): Promise<any> {
        return defaultsDeep({}, config, await this.getChildStageDefaultConfig());
    }

    async buildChildStageRoot(root: any = {}): Promise<any> {
        return defaultsDeep({}, root, await this.getChildStageDefaultRoot());
    }

    async buildChildStageUid(stageUid = '') {
        return this.buildStageUidWithCurrentExecutionUid(stageUid || this.getChildStage());
    }

    async buildChildStageBody(options_: any = {}, config_: any = {}, root_: any = {}) {
        const options = await this.buildChildStageOptions(options_, root_);
        const config = await this.buildChildStageConfig(config_);
        const root = await this.buildChildStageRoot(root_);

        const childStageUid = await this.buildChildStageUid(root.stageUid);
        return await this.buildTriggerStageBody(childStageUid, options, config, root);
    }
    // #endregion

    async _findStageExecutionList(transactionUid, stageUid, executionUid) {
        const stageExecutionList = await StageExecutionProvider.findAllByTransactionAndModule(transactionUid, stageUid, executionUid);

        const sorted = sortBy(stageExecutionList, 'id');

        return sorted;
        // const length = await this.getLengthValue();
        // return filteredStageExecutionList.slice(0, length);
    }

    async _findStageExecutionListAfter(transactionUid, stageUid, executionUid) {
        const stageExecutionList = await this._findStageExecutionList(transactionUid, stageUid, executionUid);
        const filtered = filter(stageExecutionList, (stageExecution) => stageExecution.id > this.stageExecution.id);
        return filtered;
    }

    async findStageExecutionListAfter(stageUid, executionUid = '') {
        return this._findStageExecutionListAfter(this.transactionUid, stageUid, executionUid);
    }

    _getTriggerParams(params, stageUidAndExecutionUid) {
        let result = {};
        if (!stageUidAndExecutionUid) return result;
        const { stageUid } = this.separateStageUidAndExecutionUid(stageUidAndExecutionUid);

        params = cloneDeep(params || {});
        if (!size(params)) return result;

        const firstKey = Object.keys(params)[0];
        const stageParams = defaultsDeep({}, params[stageUidAndExecutionUid] || params[stageUid]);
        if (size(stageParams) > 0) {
            result = stageParams;
        }
        // assuming that the first option will be certain to decide if it is a stageUid
        else if (!this.isLikeStageUid(firstKey)) {
            result = params;
        }

        return result;
    }
}

export interface StagesMixin
    extends MultipleExecutionStageMixin,
        SnapshotMixin,
        StackTriggerMixin,
        ForwardedMixin,
        ForwardedResultsMixin,
        PathMixin {}
