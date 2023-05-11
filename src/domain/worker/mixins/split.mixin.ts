
import _debug from 'debug';
const debug = _debug('app:workflow:split');

import { exitRequest } from 'node_common/dist/utils/errors';
import { StageStatusEnum } from '../../../types/stageStatus.type';
import { ResultInterface } from '../../../interfaces/result.interface';


export class SplitMixin {

    protected async splitExecute({ stateService, lengthKeyPrefix = '' }): Promise<ResultInterface | null> {
        try {

            if (this['stageExecution'].statusUid !== StageStatusEnum.WAITING) {
                this['beforeSplitStart'] && (await this['beforeSplitStart']());

                const { lengthKey } = this.getKeys(lengthKeyPrefix);
                const length = (await stateService.getValue(lengthKey));

                if (length === '0') {
                    // if there is no split process proceed to next stage
                    return { statusUid: StageStatusEnum.DONE };
                }

                return {
                    statusUid: StageStatusEnum.WAITING,
                    _options: {
                        after: () => this.splitStagesTrigger({ stateService, lengthKeyPrefix })
                    }
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
            this['afterSplitEnd'] && (await this['afterSplitEnd']());
            if (!saved) {
                // will get here when concurrent updates find each other
                return null;
            }

            // finished all child
            return { statusUid: StageStatusEnum.DONE };
        }
        // still waiting other child to finish
        return { statusUid: StageStatusEnum.WAITING };
    }

    private getKeys(lengthKeyPrefix) {
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

        const length = (await stateService.getValue(lengthKey));
        if (!length) {
            exitRequest(`lenghKey not found to send parallel events`);
        }

        // TODO: review if is needed
        // run split stage after updating stage execution status
        setTimeout(() =>
            this['splitStage'](length)
            , 1000);
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
                }
            };

            // debug('new event will be created', this['worflowEventName'], body);
            await this['triggerStage'](this['worflowEventName'], body);
            // break;
        }
    }

    protected splitStageGlobalOptions(options) {
        return {
            transactionUid: this['transactionUid'],
            stageUid: this['stageConfig'].config.splitStage,
            options: {
                ...options,
                ...this['fowardInternalOptions'](),
            }
        };
    }
}
