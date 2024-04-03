import _debug from 'debug';
const debug = _debug('worker:stage:ParallelWorker');
import { defaultsDeep, filter, map, omit, reduce, sortBy } from 'lodash';

import { applyMixins } from 'node-labs/lib/utils/mixin';
import { StageStatusEnum } from '../../../types/stageStatus.type';
import { ResultInterface } from '../../../interfaces/result.interface';
import { StageExecutionProvider } from '../../../providers/stageExecution.provider';
import { SplitMixin } from './split.mixin';

export abstract class ParallelWorkerGeneric {
    limitRows = 1000;
    splitStageOptions: any = {};

    public getDefaultOptions() {
        const defaultOptions = defaultsDeep({}, this['defaultOptions'], {
            bulkLimit: 50000,
            lengthLimit: 0,
        });
        return defaultOptions;
    }

    /* do not replace methods bellow */
    /* split lifecycle */
    public async afterSplitEnd(): Promise<void> {
        await this.down();
    }

    public async execute(): Promise<ResultInterface | null> {
        try {
            return await this['splitExecute'](this['splitExecuteOptions']());
        } catch (error) {
            this['logError'](error);
            return { statusUid: StageStatusEnum.FAILED, errorMessage: error.message };
        }
    }

    getLengthKeyPrefix() {
        return [this.rootDir, this.getChildStageUid()].join('/');
    }

    getLengthKey() {
        return [this.getLengthKeyPrefix(), 'length'].join('/');
    }

    async getLengthValue() {
        const stateService = this['getStateService']();
        return await stateService.getValue(this.getLengthKey());
    }

    async setLengthValue(value: number) {
        const stateService = this['getStateService']();
        await stateService.save(this.getLengthKey(), value);
    }

    async beforeSplitResult(params: any = {}) {
        await this.setLengthValue(+params.length);
        this.splitStageOptions = {
            ...(this.splitStageOptions || {}),
            ...omit(params, 'length', 'count'),
        };
    }

    defineLimits(options) {
        const bulkLimit = !this.isProjectConfigActivated('limitRows') ? options.bulkLimit : this.limitRows;
        return { bulkLimit };
    }

    async findSplitStageExecutionList() {
        const stageExecutionList = await StageExecutionProvider.findAllByTransactionAndModule(
            this.transactionUid,
            this.getChildStageUid(),
            this.executionUid,
        );
        const filteredStageExecutionList = sortBy(
            filter(stageExecutionList, (stageExecution) => stageExecution.id > this.stageExecution.id),
            'id',
        );
        const length = await this.getLengthValue();
        return filteredStageExecutionList.slice(0, length);
    }

    async calcInfoField(stageExecutionList, infoField) {
        const valueList = map(stageExecutionList, (stageExecution) => {
            const data = stageExecution.result.pop();
            return (data && data.info && data.info[infoField]) || 0;
        });

        return reduce(valueList, (prev, curr) => prev + curr);
    }

    /* replace methods bellow if needed */
    async beforeSplitStart() {
        const options = this.stageConfig.options;
        await this.up();
        const { bulkLimit } = this.defineLimits(options);

        let count = 0;

        count = await this.count();
        // debug('count', count);

        const params: any = { count };
        params.length = Math.ceil(count / bulkLimit);
        params.totalLimit = bulkLimit;
        if (options.lengthLimit && params.length > options.lengthLimit) {
            params.length = options.lengthLimit;
            params.totalLimit = Math.ceil(count / params.length);
        }

        debug(count, params.length, params);
        // length = 0;
        await this.beforeSplitResult(params);
    }

    async afterSplitStart() {
        null;
    }

    async beforeSplitEnd() {
        null;
    }

    async count(options: any = {}): Promise<any> {
        const service = this.getLocalService();
        return await service.count(options);
    }

    /* optional */
    async up(): Promise<any> {
        return null;
    }

    async down(): Promise<any> {
        return null;
    }

    abstract getLocalService();
}

applyMixins(ParallelWorkerGeneric, [SplitMixin]);

export interface ParallelWorkerGeneric extends SplitMixin {}
