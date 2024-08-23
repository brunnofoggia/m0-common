import _debug from 'debug';
const debug = _debug('worker:mixin:split');
const log = _debug('worker:essential:split');

import { defaultsDeep, result, omit, pick, isArray, cloneDeep, size, isString } from 'lodash';

import { exitRequest } from 'node-labs/lib/utils/errors';
import { StageStatusEnum } from '../../../types/stageStatus.type';
import { ResultInterface } from '../../../interfaces/result.interface';

import { StageWorker } from '../stage.worker';

export abstract class SplitMixin {
    abstract splitStageOptions;
    abstract parallelResults;

    abstract beforeSplitStart();
    abstract beforeSplitEnd();

    abstract afterSplitStart();
    // this method will be called when all child stages are done
    abstract afterSplitEnd();

    abstract getLengthKeyPrefix();
    abstract getChildStage();

    async splitExecute({ stateService, lengthKeyPrefix = '' }): Promise<ResultInterface | null> {
        try {
            const { nextKey } = this.getKeys(lengthKeyPrefix);
            const nextValue = await stateService.getValue(nextKey);

            const isStartingParallelization = this.stageExecution.statusUid !== StageStatusEnum.WAITING;
            const nextValueRemovedFromDb = typeof nextValue === 'undefined';

            // or its a new stage or a stage that required some stages before (requiredStage: results in stage waiting)
            if (isStartingParallelization || nextValueRemovedFromDb) {
                this.beforeSplitStart && (await this.beforeSplitStart());

                const { lengthKey } = this.getKeys(lengthKeyPrefix);
                const length = await stateService.getValue(lengthKey);

                if (length === '0') {
                    // if there is no split process proceed to next stage
                    return await this.splitStagesDone();
                }

                return {
                    statusUid: StageStatusEnum.WAITING,
                    _options: {
                        after: () => this.splitStagesTrigger({ stateService, lengthKeyPrefix }),
                    },
                };
            }

            return this.splitStagesResult({ stateService, lengthKeyPrefix });
        } catch (error) {
            this.logError(error);
            if (error.statusUid) return error;
            return { statusUid: StageStatusEnum.FAILED, errorMessage: error.message };
        }
    }

    async splitStagesResult({ stateService, lengthKeyPrefix }): Promise<ResultInterface | null> {
        this.beforeSplitEnd && (await this.beforeSplitEnd());
        const { lengthKey, nextKey, processKey } = this.getKeys(lengthKeyPrefix);
        const isTestingResult = this.isTestingResult();

        await stateService.increment(processKey);
        const ordered = +(await stateService.getValue(lengthKey));
        const finished = +(await stateService.getValue(processKey));

        if (ordered === finished || isTestingResult) {
            const saved = (await stateService.saveBy(nextKey, '1', '0')) || isTestingResult;
            if (!saved) {
                // will get here when concurrent updates find each other
                return null;
            }

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

    getKeys(lengthKeyPrefix = '') {
        if (!lengthKeyPrefix && this.stageConfig.config.prevStage) {
            const lengthKeyPrefixArr = [this.rootDir, this.stageConfig.config.prevStage];
            if (this.executionUid) lengthKeyPrefixArr.push(this.executionUid);
            lengthKeyPrefix = lengthKeyPrefixArr.join('/');
        }

        const stageDir = this.executionDir;

        const lengthKey = [lengthKeyPrefix, 'length'].join('/');
        const processKey = [stageDir, 'process'].join('/');
        const nextKey = [stageDir, 'next'].join('/');

        return { lengthKey, processKey, nextKey };
    }

    async splitStagesTrigger({ stateService, lengthKeyPrefix }, options: any = {}) {
        const { lengthKey, nextKey, processKey } = this.getKeys(lengthKeyPrefix);

        await stateService.save(processKey, 0);
        await stateService.save(nextKey, 0);

        const length = await stateService.getValue(lengthKey);
        if (!length) {
            exitRequest(`lengthKey not found to send parallel events (${lengthKey})`);
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

        const _body = this.splitStageGlobalOptions(options);
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
        return (this.splitStageOptions ? result(this, 'splitStageOptions') : {}) as any;
    }

    splitStageGlobalOptions(options) {
        let childOptions: any = defaultsDeep(
            {},
            this.stageConfig.config.childOptions || {},
            this.combineChildSendParams(this.stageConfig.config.childSendOptions, this.stageConfig.options),
        );
        const childConfig: any = defaultsDeep(
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

        const stageUidAndExecutionUid = this.buildStageUidWithCurrentExecutionUid(this.getChildStage());
        return this.buildTriggerStageBody(stageUidAndExecutionUid, childOptions, childConfig, childRoot);
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

    splitExecuteOptions() {
        return {
            stateService: this['getStateService'](),
            lengthKeyPrefix: this.getLengthKeyPrefix(),
        };
    }
}

export interface SplitMixin extends StageWorker {}
