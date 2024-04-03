import _debug from 'debug';
const debug = _debug('worker:mixin:split');

import { defaultsDeep, result, omit } from 'lodash';

import { exitRequest } from 'node-labs/lib/utils/errors';
import { StageStatusEnum } from '../../../types/stageStatus.type';
import { ResultInterface } from '../../../interfaces/result.interface';

import { StageWorker } from '../stage.worker';

export abstract class SplitMixin {
    abstract splitStageOptions;

    abstract beforeSplitStart();
    abstract beforeSplitEnd();

    abstract afterSplitStart();
    // this method will be called when all child stages are done
    abstract afterSplitEnd();

    abstract getLengthKeyPrefix();

    async splitExecute({ stateService, lengthKeyPrefix = '' }): Promise<ResultInterface | null> {
        try {
            const { nextKey } = this.getKeys(lengthKeyPrefix);
            const nextValue = await stateService.getValue(nextKey);

            // or its a new stage or a stage that required some stages before (requiredStage: results in stage waiting)
            if (this.stageExecution.statusUid !== StageStatusEnum.WAITING || typeof nextValue === 'undefined') {
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
            debug(error.message, error.stack);
            if (error.statusUid) return error;
            return { statusUid: StageStatusEnum.FAILED, errorMessage: error.message };
        }
    }

    async splitStagesResult({ stateService, lengthKeyPrefix }): Promise<ResultInterface | null> {
        this.beforeSplitEnd && (await this.beforeSplitEnd());
        const { lengthKey, nextKey, processKey } = this.getKeys(lengthKeyPrefix);

        await stateService.increment(processKey);

        const ordered = +(await stateService.getValue(lengthKey));
        const finished = +(await stateService.getValue(processKey));

        if (ordered === finished) {
            const saved = await stateService.saveBy(nextKey, '1', '0');
            if (!saved) {
                // will get here when concurrent updates find each other
                return null;
            }

            // finished all child
            return await this.splitStagesDone();
        }
        // still waiting other child to finish
        return { statusUid: StageStatusEnum.WAITING };
    }

    // this method will be called when all child stages are done
    async splitStagesDone() {
        this.afterSplitEnd && (await this.afterSplitEnd());
        return { statusUid: StageStatusEnum.DONE };
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
            exitRequest(`lenghKey not found to send parallel events`);
        }

        await this.splitStage(length, options);
    }

    getSplitStageUid() {
        return this.stageConfig.config.childStage || this.stageConfig.config.splitStage;
    }

    async splitStage(length = '0', options: any = {}) {
        if (!this.getSplitStageUid() || this.stageExecution.data._triggerSplitStage === 0) return;

        const _body = this.splitStageGlobalOptions(options);
        const _indexTo = this.getSplitStageOptions()['_indexTo'] || [];
        debug(`length: ${length}`);

        for (let counter = 0; counter < +length; counter++) {
            const indexTo = _indexTo[counter] || {};
            const body = {
                ...omit(_body, 'options'),
                options: {
                    ..._body.options,
                    ...indexTo,
                    index: counter,
                },
            };

            // debug('new event will be created', this.worflowEventName, body);
            await this.triggerStageToDefaultProvider(this.worflowEventName, body);
            // break;
        }

        this.afterSplitStart && (await this.afterSplitStart());
    }

    getSplitStageOptions() {
        return (this.splitStageOptions ? result(this, 'splitStageOptions') : {}) as any;
    }

    splitStageGlobalOptions(options) {
        const baseOptions: any = {};
        if (this.stageConfig.config._sendAsCallback) {
            baseOptions.callbackStage = this.buildCurrentStageUidAndExecutionUid();
        }

        options = defaultsDeep(
            options,
            {
                ...omit(this.getSplitStageOptions(), '_indexTo'),
                ...baseOptions,
            },
            this.fowardInternalOptions(),
        );

        const stageUidAndExecutionUid = this.buildStageUidWithCurrentExecutionUid(this.getSplitStageUid());
        return this.buildTriggerStageBody(stageUidAndExecutionUid, options);
    }

    splitExecuteOptions() {
        return {
            stateService: this['getStateService'](),
            lengthKeyPrefix: this.getLengthKeyPrefix(),
        };
    }
}

export interface SplitMixin extends StageWorker {}
