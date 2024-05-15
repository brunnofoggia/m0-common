import { defaultsDeep, isArray } from 'lodash';

import { StageGeneric } from 'domain/worker/stage.generic';
import { PathMixin } from './path.mixin';

export abstract class StagesMixin {
    abstract fowardInternalOptions(): any;

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
        return this.stageConfig.config.callbackStage || this._getParentStage() || this.stageExecution.data.options?._calledByStage;
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
    async triggerChildStage(options_: any = {}, config_: any = {}) {
        const body = await this.buildChildStageBody(options_, config_);
        return await this.triggerStageToDefaultProvider(this.worflowEventName, body);
    }

    async getChildStageDefaultOptions(): Promise<any> {
        const defaultOptions = {
            transactionUid: this.transactionUid,
            index: this.getIndex(),
        };

        return defaultOptions;
    }

    async buildChildStageOptions(options: any = {}): Promise<any> {
        return defaultsDeep({}, options, await this.getChildStageDefaultOptions(), this.fowardInternalOptions());
    }

    async getChildStageDefaultConfig(): Promise<any> {
        const defaultConfig = {
            callbackStage: this.buildCurrentStageUidAndExecutionUid(),
            callbackIndex: this.getIndex(),
        };

        return defaultConfig;
    }

    async buildChildStageConfig(config: any = {}): Promise<any> {
        return defaultsDeep({}, config, await this.getChildStageDefaultConfig());
    }

    async buildChildStageUid() {
        return this.buildStageUidWithCurrentExecutionUid(this.getChildStage());
    }

    async buildChildStageBody(options_: any = {}, config_: any = {}) {
        const options = await this.buildChildStageOptions(options_);
        const config = await this.buildChildStageConfig(config_);

        const childStageUid = await this.buildChildStageUid();
        return this.buildTriggerStageBody(childStageUid, options, config);
    }
    // #endregion
}

export interface StagesMixin extends StageGeneric, PathMixin {}
