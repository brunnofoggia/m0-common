import { defaultsDeep, filter, isArray, sortBy } from 'lodash';

import { StageGeneric } from '../../../../domain/worker/stage.generic';
import { PathMixin } from './path.mixin';
import { StageExecutionProvider } from '../../../../providers/stageExecution.provider';
import { BodyInterface } from '../../../../interfaces/body.interface';

export abstract class StagesMixin {
    parentStageConfig: any = {};
    abstract forwardInternalOptions(): any;
    abstract stackTriggers: Array<BodyInterface>;

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
        return this.stageConfig.config.prevStage || this.stageExecution.data.options?._calledByStage;
    }

    getPrevStageList() {
        const prevStage_ = this.getPrevStage();
        return isArray(prevStage_) ? prevStage_ : [prevStage_];
    }

    getParentStage() {
        const parentStage =
            this.stageConfig.config.callbackStage || this._getParentStage() || this.stageExecution.data.options?._calledByStage;
        if (!parentStage) {
            throw new Error('Parent stage could not be determined');
        }
        return parentStage;
    }

    async setParentStageConfig() {
        this.parentStageConfig = {};

        const parentStage = this.getParentStage();
        if (parentStage) {
            this.parentStageConfig = await this.findStageConfig(parentStage);
        }
    }

    getParentStageDir() {
        const stageUid = this.replaceStageExecutionSplitter(this.getParentStage());
        return [this.rootDir, stageUid].join('/');
    }

    getChildStage() {
        return this.stageConfig.config.childStage || this.stageConfig.config.splitStage;
    }
    // #endregion

    // #region child stage
    async triggerChildStage(options_: any = {}, config_: any = {}, root_: any = {}) {
        const stageUid = this.getChildStage() || root_.stageUid;
        if (!stageUid || this.stageExecution.data.options?._triggerChildStage === 0) return;

        const body = await this.buildChildStageBody(options_, config_, root_);
        return this.addTriggerToStack(body);
    }

    async getChildStageDefaultOptions(): Promise<any> {
        const defaultOptions = {
            index: this.getIndex(),
        };

        return defaultOptions;
    }

    async buildChildStageOptions(options: any = {}): Promise<any> {
        return defaultsDeep({}, options, await this.getChildStageDefaultOptions(), this.forwardInternalOptions());
    }

    async getChildStageDefaultConfig(): Promise<any> {
        const defaultConfig: any = {};
        const shouldCallback = !!this.stageConfig.config.childCallback;
        if (shouldCallback) {
            defaultConfig.callbackStage = this.buildCurrentStageUidAndExecutionUid();
            defaultConfig.callbackIndex = this.getIndex();
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
        const options = await this.buildChildStageOptions(options_);
        const config = await this.buildChildStageConfig(config_);
        const root = await this.buildChildStageRoot(root_);

        const childStageUid = await this.buildChildStageUid(root.stageUid);
        return this.buildTriggerStageBody(childStageUid, options, config, root);
    }
    // #endregion

    // #region stack triggers
    getStackedTriggers() {
        return this.stackTriggers;
    }

    addTriggerToStack(body: BodyInterface) {
        this.stackTriggers.push(body);
    }

    async triggerStackDispatch() {
        const stackTriggers = this.getStackedTriggers() || [];
        if (!stackTriggers.length) return;

        for (const body of stackTriggers) {
            await this.triggerStageToDefaultProvider(this.worflowEventName, body);
        }
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
}

export interface StagesMixin extends StageGeneric, PathMixin {}
