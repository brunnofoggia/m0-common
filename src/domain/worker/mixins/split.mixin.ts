import _debug from 'debug';
const debug = _debug('worker:mixin:split');

import { defaultsDeep, result } from 'lodash';

import { exitRequest } from 'node_common/dist/utils/errors';
import { StageStatusEnum } from '../../../types/stageStatus.type';
import { ResultInterface } from '../../../interfaces/result.interface';

export class SplitMixin {
    protected async splitExecute({ stateService, lengthKeyPrefix = '' }): Promise<ResultInterface | null> {
        try {
            const { nextKey } = this.getKeys(lengthKeyPrefix);
            const nextValue = await stateService.getValue(nextKey);

            // or its a new stage or a stage that required some stages before (requiredStage: results in stage waiting)
            if (this['stageExecution'].statusUid !== StageStatusEnum.WAITING || typeof nextValue === 'undefined') {
                this['beforeSplitStart'] && (await this['beforeSplitStart']());

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
            debug(error.message);
            return { statusUid: StageStatusEnum.FAILED, errorMessage: error.message };
        }
    }

    private async splitStagesResult({ stateService, lengthKeyPrefix }): Promise<ResultInterface | null> {
        this['beforeSplitEnd'] && (await this['beforeSplitEnd']());
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

    protected async splitStagesDone() {
        this['afterSplitEnd'] && (await this['afterSplitEnd']());
        return { statusUid: StageStatusEnum.DONE };
    }

    protected getKeys(lengthKeyPrefix = '') {
        if (!lengthKeyPrefix && this['stageConfig'].config.prevStage)
            lengthKeyPrefix = [this['rootDir'], this['stageConfig'].config.prevStage].join('/');

        const stageDir = this['stageDir'];

        const lengthKey = [lengthKeyPrefix, 'length'].join('/');
        const processKey = [stageDir, 'process'].join('/');
        const nextKey = [stageDir, 'next'].join('/');

        return { lengthKey, processKey, nextKey };
    }

    private async splitStagesTrigger({ stateService, lengthKeyPrefix }) {
        const { lengthKey, nextKey, processKey } = this.getKeys(lengthKeyPrefix);

        await stateService.save(processKey, 0);
        await stateService.save(nextKey, 0);

        const length = await stateService.getValue(lengthKey);
        if (!length) {
            exitRequest(`lenghKey not found to send parallel events`);
        }

        // TODO: review if is needed
        // run split stage after updating stage execution status
        // setTimeout(() =>
        await this['splitStage'](length);
        // , 1000);
    }

    protected async splitStage(length = '0', options: any = {}) {
        // console.log(`will trigger ${length} events of ${this.stageConfig.config.splitStage}`);

        if (!this['stageConfig'].config.splitStage) return;

        const _body = this.splitStageGlobalOptions(options);
        debug(`length: ${length}`);

        for (let counter = 0; counter < +length; counter++) {
            const body = {
                ..._body,
                options: {
                    ..._body.options,
                    index: counter,
                },
            };

            // debug('new event will be created', this['worflowEventName'], body);
            await this['triggerStage'](this['worflowEventName'], body);
            // break;
        }

        this['afterSplitStart'] && (await this['afterSplitStart']());
    }

    protected splitStageGlobalOptions(options) {
        options = defaultsDeep(options, {
            ...(this['splitStageOptions'] ? result(this, 'splitStageOptions') : {}),
        });

        return {
            transactionUid: this['transactionUid'],
            stageUid: this['stageConfig'].config.splitStage,
            options: {
                ...options,
                ...this['fowardInternalOptions'](),
            },
        };
    }
}
