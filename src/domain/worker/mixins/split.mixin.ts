import _debug from 'debug';
const debug = _debug('worker:mixin:split');
const log = _debug('worker:essential:split');

import { defaultsDeep, result, omit, pick, isArray, cloneDeep, size, isString } from 'lodash';

import { exitRequest } from 'node-labs/lib/utils/errors';

import { StageStatusEnum } from '../../../types/stageStatus.type';
import { ResultInterface } from '../../../interfaces/result.interface';

import { StageWorker } from '../stage.worker';

export enum ChildStageStatusEnum {
    STARTING = 'starting',
    WAITING = 'waiting',
    DONE = 'done',
    FAILED = 'failed',
}

export abstract class SplitMixin {
    abstract splitStageOptions;
    abstract childStageOptions;
    abstract childStageConfig;
    abstract parallelResults;

    abstract beforeSplitStart(): Promise<void>;
    abstract beforeSplitEnd(): Promise<void>;

    abstract afterSplitStart(): Promise<void>;
    // this method will be called when all child stages are done
    abstract afterSplitEnd(): Promise<void>;

    abstract getChildStage();

    _stateService: any;
    _lengthKeyPrefix: any;
    _childKeys: any;

    async splitExecute({ stateService, lengthKeyPrefix = '' }): Promise<ResultInterface | null> {
        try {
            const { statusValue } = await this._setupChildProcess({ stateService, lengthKeyPrefix });
            const nextValue = await this._getChildNextValue();

            const stageIsDone = this.stageExecution.statusUid === StageStatusEnum.DONE;
            const statusIsDone = statusValue === StageStatusEnum.DONE;
            // avoid to finish stage twice
            if (stageIsDone || (statusIsDone && nextValue === '1')) {
                // avoiding to execute after split end twice
                // and also to deliver another result
                log('parallelization already done');
                return null;
            }

            const isStartingParallelization = statusValue === StageStatusEnum.INITIAL;
            const nextValueRemovedFromDb = typeof nextValue === 'undefined';

            // or its a new stage or a stage that required some stages before (requiredStage: results in stage waiting)
            if (isStartingParallelization || nextValueRemovedFromDb) {
                this.beforeSplitStart && (await this.beforeSplitStart());

                const length = await this._getChildLengthValue();
                if (length === '0' || typeof length === 'undefined') {
                    // if there is no split process proceed to next stage
                    return await this.splitStagesDone();
                }

                await this._setChildStatusTo(StageStatusEnum.WAITING);
                await this.splitStagesTrigger({ stateService, lengthKeyPrefix });
                return this.statusWaiting();
            }

            return this.splitStagesResult();
        } catch (_error) {
            const error = isString(_error) ? new Error(_error) : _error;

            this.logError(error);
            this.setExecutionError(error, error.statusUid);

            return this.status();
        }
    }

    async _setupChildProcess({ stateService, lengthKeyPrefix }) {
        this._stateService = stateService;
        this._lengthKeyPrefix = lengthKeyPrefix;
        this._setChildKeys(lengthKeyPrefix);
        const childStage = this.getChildStage();

        if (!stateService) throw new Error(`State service undefined`);
        if (!stateService?.getValue) throw new Error(`State service getValue method not found. Please check the service implementation`);

        if (!childStage) throw new Error(`Child stage not found`);

        const statusValue = await this._setInitialStatus();
        return { statusValue };
    }

    async splitStagesResult(): Promise<ResultInterface | null> {
        const stateService = this._stateService;
        this.beforeSplitEnd && (await this.beforeSplitEnd());
        const isTestingResult = this.isTestingResult();

        await stateService.increment(this._childKeys.process);
        const ordered = +(await stateService.getValue(this._childKeys.length));
        const finished = +(await stateService.getValue(this._childKeys.process));

        if (ordered === finished || isTestingResult) {
            const saved = (await stateService.saveBy(this._childKeys.next, '1', '0')) || isTestingResult;
            await stateService.clearByPrefix(this.getBaseKeyPrefix());
            if (!saved) {
                // will get here when concurrent updates find each other
                return null;
            }

            await this._setChildStatusTo(StageStatusEnum.DONE);
            // finished all child
            return await this.splitStagesDone();
        } else if (finished > ordered) {
            return this.statusFailed({ errorMessage: `finished: ${finished} > ordered: ${ordered}` });
        }

        // still waiting other child to finish
        return this.statusWaiting();
    }

    isTestingResult() {
        return !!this.stageExecution.data.options?._testResult;
    }

    // this method will be called when all child stages are done
    async splitStagesDone(results: any = {}) {
        this.afterSplitEnd && (await this.afterSplitEnd());
        return this.splitStagesDoneResult(results);
    }

    async splitStagesDoneResult(results_: any = {}) {
        const results = this.mergeParallelResults(results_);
        const isTestingResult = this.isTestingResult();
        return !isTestingResult ? this.status(results) : this.statusWaiting(results);
    }

    mergeParallelResults(results_) {
        return defaultsDeep({}, results_, this.parallelResults || {});
    }

    async splitStagesTrigger({ stateService, lengthKeyPrefix }, options: any = {}) {
        await stateService.save(this._childKeys.process, 0);
        await stateService.save(this._childKeys.next, 0);

        const length = await stateService.getValue(this._childKeys.length);
        if (!length) {
            exitRequest(`lengthKey not found to send parallel events (${this._childKeys.length})`);
        }

        await this.splitStage(length, options);
    }

    async splitStage(length = '0', options: any = {}) {
        if (
            !this.getChildStage() ||
            this.stageExecution.data.options?._triggerSplitStage === 0 ||
            this.stageExecution.data.options?._triggerChildStage === 0
        )
            return;

        const _body = await this.splitStageGlobalOptions(options);
        const _indexTo = this.getSplitStageOptions()['_indexTo'] || [];
        debug(`length: ${length}`);

        for (let counter = 0; counter < +length; counter++) {
            const indexTo = _indexTo[counter] || {};
            const _options = {
                ...omit(_body.options, 'index'),
                ...omit(indexTo, 'transactionUid'),
                index: counter,
            };

            await this.triggerChildStage(_options, _body.config, {
                ...omit(_body, 'options', 'config'),
                ...pick(indexTo, 'transactionUid', 'projectUid', 'stageUid'),
            });
        }

        this.afterSplitStart && (await this.afterSplitStart());
    }

    getSplitStageOptions() {
        const options = { ...((result(this, 'splitStageOptions') || {}) as any), ...((result(this, 'childStageOptions') || {}) as any) };
        return options as any;
    }

    getChildStageConfig() {
        return (this.childStageConfig ? result(this, 'childStageConfig') : {}) as any;
    }

    async splitStageGlobalOptions(options) {
        let childOptions: any = defaultsDeep(
            {},
            this.stageConfig.config.childOptions || {},
            this.combineChildSendParams(this.stageConfig.config.childSendOptions, this.stageConfig.options),
        );
        let childConfig: any = defaultsDeep(
            {},
            this.stageConfig.config.childConfig || {},
            this.combineChildSendParams(this.stageConfig.config.childSendConfig, this.stageConfig.config),
        );
        const childRoot: any = defaultsDeep({}, this.stageConfig.config.childRoot || {});

        // send callback stage to child stage
        const shouldCallback = !!this.stageConfig.config.childCallback;
        if (shouldCallback) {
            childConfig.callbackStage = this.buildCurrentStageUidAndExecutionUid();
        }

        // combine everything
        childOptions = defaultsDeep(
            {},
            options,
            childOptions,
            omit(this.getSplitStageOptions(), '_indexTo'),
            this.forwardInternalOptions(),
        );
        childConfig = defaultsDeep({}, childConfig, omit(this.getChildStageConfig(), '_indexTo'));

        const stageUidAndExecutionUid = this.buildStageUidWithCurrentExecutionUid(this.getChildStage());
        return await this.buildTriggerStageBody(stageUidAndExecutionUid, childOptions, childConfig, childRoot);
    }

    // send options or config to child stage
    combineChildSendParams(sendParams, params) {
        if (!sendParams) return {};

        let pickParamsList = sendParams;
        if (isString(pickParamsList)) pickParamsList = [pickParamsList];

        let pickParams = cloneDeep(params);
        if (isArray(pickParamsList) && size(pickParamsList)) {
            pickParams = pick(pickParams, ...pickParamsList);
        }

        return pickParams;
    }

    async splitExecuteOptions() {
        return {
            stateService: await this['getStateService'](),
            lengthKeyPrefix: this.getLengthKeyPrefix(),
        };
    }

    // #region flags
    getKeys(lengthKeyPrefix = '') {
        if (!lengthKeyPrefix && this.stageConfig.config.prevStage) {
            const lengthKeyPrefixArr = [this.rootDir, this.stageConfig.config.prevStage];
            if (this.executionUid) lengthKeyPrefixArr.push(this.executionUid);
            lengthKeyPrefix = lengthKeyPrefixArr.join('/');
        }

        const basePrefix = this.getBaseKeyPrefix();
        const statusKey = [basePrefix, 'status'].join('/');
        const lengthKey = [lengthKeyPrefix, 'length'].join('/');
        const processKey = [basePrefix, 'process'].join('/');
        const nextKey = [basePrefix, 'next'].join('/');

        return { lengthKey, processKey, nextKey, statusKey };
    }

    _setChildKeys(lengthKeyPrefix = null) {
        const { lengthKey, processKey, nextKey, statusKey } = this.getKeys(lengthKeyPrefix || this.getLengthKeyPrefix());
        this._childKeys = {};
        this._childKeys.length = lengthKey;
        this._childKeys.process = processKey;
        this._childKeys.next = nextKey;
        this._childKeys.status = statusKey;
    }

    async _getChildNextValue() {
        return await this._stateService.getValue(this._childKeys.next);
    }

    async _getChildLengthValue() {
        return await this._stateService.getValue(this._childKeys.length);
    }

    async _setInitialStatus() {
        const statusValue = await this._getChildStatus();

        if (typeof statusValue === 'undefined') {
            return this._setChildStatusTo(StageStatusEnum.INITIAL);
        }
        return statusValue;
    }

    async _getChildStatus() {
        const stateService = this._stateService;
        return await stateService.getValue(this._childKeys.status);
    }

    async _setChildStatusTo(status: StageStatusEnum) {
        const stateService = this._stateService;
        await stateService.save(this._childKeys.status, status);
        return status;
    }

    getBaseKeyPrefix() {
        const stageDir = this.executionDir;
        const basePrefix = [stageDir];
        const stageExecutionId = this.stageExecution.id + '';
        if (stageExecutionId) basePrefix.push(stageExecutionId);

        return basePrefix.join('/');
    }

    getLengthKeyPrefix() {
        const prefix = [this.getBaseKeyPrefix(), this.getChildStage()];
        return prefix.join('/');
    }

    getLengthKey() {
        return [this.getLengthKeyPrefix(), 'length'].join('/');
    }

    async getLengthValue() {
        return await this._stateService.getValue(this.getLengthKey());
    }

    async setLengthValue(value: number) {
        await this._stateService.save(this.getLengthKey(), value);
    }

    // #endregion
}

export interface SplitMixin extends StageWorker {}
