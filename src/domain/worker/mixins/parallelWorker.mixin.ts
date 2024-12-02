import _debug from 'debug';
const debug = _debug('worker:stage:ParallelWorker');
import { defaultsDeep, filter, map, omit, reduce, reverse, sortBy } from 'lodash';
import Decimal from 'decimal.js';

import { applyMixins } from 'node-labs/lib/utils/mixin';
import { StageStatusEnum } from '../../../types/stageStatus.type';
import { ResultInterface } from '../../../interfaces/result.interface';
import { StageExecutionProvider } from '../../../providers/stageExecution.provider';
import { SplitMixin } from './split.mixin';

export abstract class ParallelWorkerGeneric {
    limitRows = 1000;
    splitStageOptions: any = {};
    parallelResults: any = {};

    public getDefaultOptions() {
        const defaultOptions = defaultsDeep({}, this.defaultOptions, {
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
            return await this.splitExecute(this.splitExecuteOptions());
        } catch (error) {
            this.logError(error);

            return { statusUid: StageStatusEnum.FAILED, errorMessage: error.message };
        }
    }

    defineLimits(options) {
        const bulkLimit = !this.isProjectConfigActivated('limitRows') ? options.bulkLimit : this.limitRows;
        return { bulkLimit };
    }

    async findChildStageExecutionList() {
        const stageExecutionList = await StageExecutionProvider.findAllByTransactionAndModule(
            this.transactionUid,
            this.getChildStage(),
            this.executionUid,
            'none',
        );

        const filteredStageExecutionList = reverse(
            sortBy(
                filter(stageExecutionList, (stageExecution) => stageExecution.id > this.stageExecution.id),
                'id',
            ),
        );

        const indexFoundList = [];
        const removedDuplicatedStageExecutionList = [];
        filteredStageExecutionList.forEach((stageExecution) => {
            if (indexFoundList.indexOf(stageExecution.index) === -1) {
                indexFoundList.push(stageExecution.index);
                removedDuplicatedStageExecutionList.push(stageExecution);
            }
        });

        const length = await this._getChildLengthValue();
        return filteredStageExecutionList.slice(0, length);
    }

    getValueListFromInfoField(stageExecutionList, infoField) {
        return map(stageExecutionList, (stageExecution) => {
            const lastResult = this._getLastResult(stageExecution);
            return (lastResult && lastResult.info && lastResult.info[infoField]) || 0;
        });
    }

    _getLastResult(stageExecution) {
        return stageExecution.result[stageExecution.result.length - 1];
    }

    async calcInfoField(stageExecutionList, infoField): Promise<number> {
        const valueList = this.getValueListFromInfoField(stageExecutionList, infoField);
        return reduce(valueList, (prev, curr) => prev + curr);
    }

    async calcDecimalInfoField(stageExecutionList, infoField): Promise<number> {
        const valueList = this.getValueListFromInfoField(stageExecutionList, infoField);
        let decimal = new Decimal(0);

        valueList.forEach((value) => {
            decimal = decimal.plus(value);
        });

        return +decimal.toFixed(4);
    }

    async beforeSplitResult(params: any = {}) {
        await this.setLengthValue(+params.length);
        this.splitStageOptions = {
            ...(this.splitStageOptions || {}),
            ...omit(params, 'length', 'count'),
        };
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

    async count(options: any = {}): Promise<any> {
        const service = this.getLocalService();
        return await service.count(options);
    }

    /* optional */
    async afterSplitStart() {
        null;
    }

    async beforeSplitEnd() {
        null;
    }

    async up(): Promise<any> {
        return null;
    }

    async down(): Promise<any> {
        return null;
    }

    abstract getLocalService();

    // #region legacy code
    async findSplitStageExecutionList() {
        return this.findChildStageExecutionList();
    }

    // #endregion
}

applyMixins(ParallelWorkerGeneric, [SplitMixin]);

export interface ParallelWorkerGeneric extends SplitMixin {}
