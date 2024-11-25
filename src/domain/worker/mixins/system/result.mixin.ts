import _debug from 'debug';
const debug = _debug('worker:stage');
const essentialInfo = _debug('worker:essential:stage');
import { defaultsDeep, isString, omit } from 'lodash';

import { ResultInterface } from '../../../../interfaces/result.interface';
import { StageAllProperties } from '../../../../interfaces/stageParts.interface';
import { StageStatusEnum } from '../../../../types/stageStatus.type';
import { StageUidAndExecutionUid } from '../../../../interfaces/stageExecution.interface';

export abstract class ResultMixin {
    abstract stageExecutionMocked: boolean;
    abstract system: any;
    abstract worflowEventName: string;
    abstract logError(error: any): void;
    abstract getIndex(): number;
    abstract joinStageUidWithCurrentExecutionUid(stageUid: string): string;
    abstract separateStageUidAndExecutionUid(stageUidAndExecUid: string): StageUidAndExecutionUid;
    abstract triggerStageToDefaultProvider(_name: string, body: any): Promise<any>;

    buildStageBody(stageUidAndExecutionUid: string, options: any = {}, config: any = {}, root: any = {}): any {
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

        // clear index from possible quotes
        if (options.index && isString(options.index)) {
            options.index = options.index.replace(/"/g, '');
        }

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

    async sendResultAsMessage(result: ResultInterface): Promise<ResultInterface> {
        essentialInfo(
            `result:`,
            omit(result, '_options'),
            '; stage:',
            this.stageUid,
            '; execUid:',
            this.executionUid,
            '; index: ',
            this.getIndex(),
        );

        try {
            result.statusUid = result.statusUid || StageStatusEnum.UNKNOWN;

            !result.system && (result.system = {});
            result.system.startedAt = this.system.startedAt;
            result.system.finishedAt = this.system.finishedAt;
            // runs before trigger result to catch errors
            result._options?.after && (await result._options.after());
        } catch (error) {
            this.logError(error);
            result = this.buildExecutionError(error);
        }

        if (!this.skipPersistResult(result)) {
            await this.triggerExecutionResult(result);
        } else {
            debug('skipping persist result');
        }
        return result;
    }

    skipPersistResult(result: ResultInterface) {
        return typeof result === 'undefined' || result === null || this.stageExecutionMocked || this.body.options._pureExecution;
    }

    buildExecutionError(error) {
        const result: any = {
            statusUid: StageStatusEnum.UNKNOWN,
            errorCode: error.code || '',
            errorMessage: this.formatErrorMessage(error),
        };

        if (error.statusUid) result.statusUid = error.statusUid;

        return result;
    }

    formatErrorMessage(error: any) {
        let errorMessage = error?.message || '';
        errorMessage = (errorMessage + '').replace(/[\n\r]/g, ' ');

        return errorMessage;
    }

    async triggerExecutionResult(result_: ResultInterface) {
        const result = {
            ...omit(result_, '_options'),
            errorMessage: (result_.errorMessage || '').split('\n')[0],
        };

        // avoid infinity loop when waiting multiple child process
        // but with this waiting status never is saved
        // if (result.status === StageStatusEnum.WAITING) return;
        const body = this.buildTriggerStageResultBody({}, result);
        return this.triggerStageToDefaultProvider(this.worflowEventName, body);
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
}

export interface ResultMixin extends StageAllProperties {}
