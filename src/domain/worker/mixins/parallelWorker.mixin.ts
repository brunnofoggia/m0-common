import _debug from 'debug';
const debug = _debug('worker:stage:ParallelWorker');
import { bind, defaultsDeep, filter, get, isArray, map, omit, reduce, reverse, sortBy } from 'lodash';
import Decimal from 'decimal.js';

import { applyMixins } from 'node-labs/lib/utils/mixin';
import { ResultInterface } from '../../../interfaces/result.interface';
import { StageExecutionProvider } from '../../../providers/stageExecution.provider';
import { SplitMixin } from './split.mixin';

export abstract class ParallelWorkerGeneric {
    limitRows = 1000;
    splitStageOptions: any = {};
    childStageOptions: any = {};
    childStageConfig: any = {};
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
            return lastResult && lastResult.info && get(lastResult.info, infoField, 0);
        });
    }

    getValueListFromErrorField(stageExecutionList) {
        return map(stageExecutionList, (stageExecution) => {
            const lastError = this._getLastError(stageExecution);
            return lastError;
        });
    }

    _getLastResult(stageExecution) {
        return stageExecution.result[stageExecution.result.length - 1];
    }

    _getLastError(stageExecution) {
        return stageExecution.error[stageExecution.error.length - 1];
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

    async afterSplitEnd(): Promise<void> {
        await this.down();
        await this.childDoneResult();
    }

    async afterSplitFailed(): Promise<void> {
        const childStageExecutionList = await this.findChildStageExecutionList();
        const childErrors = this.getValueListFromErrorField(childStageExecutionList);
        if (childErrors?.length) {
            this.setExecutionInfoValue('childErrors', childErrors);
        }
    }

    public async execute(): Promise<ResultInterface | null> {
        const options = await this.splitExecuteOptions();
        return await this.splitExecute(options);
    }

    async childDoneResult(): Promise<void> {
        const childStageExecutionList = await this.findChildStageExecutionList();
        await this.childCalcResults(childStageExecutionList);
    }

    async childCalcResults(stageExecutionList) {
        const calcChildResults = this.stageConfig.config.calcChildResults || [];
        if (!isArray(calcChildResults) || !calcChildResults?.length) return;

        for (const calcResult of calcChildResults) {
            const { keyPath, outputKey, isDecimal = false } = calcResult;
            const method = bind(isDecimal ? this.calcDecimalInfoField : this.calcInfoField, this);
            const value = await method(stageExecutionList, keyPath);

            this.setExecutionInfoValue(outputKey, value);
        }
    }

    /* replace methods bellow if needed */
    async beforeSplitStart(): Promise<void> {
        await this._stateService.clearByPrefix(this.getBaseKeyPrefix());

        const options = this.stageConfig.options;
        await this.up();
        const { bulkLimit } = this.defineLimits(options);

        let count = 0;

        count = await this.count();
        // console.log('count', count);

        const params: any = { count };
        params.length = Math.ceil(count / bulkLimit);
        params.totalLimit = bulkLimit;
        if (options.lengthLimit && params.length > options.lengthLimit) {
            params.length = options.lengthLimit;
            params.totalLimit = Math.ceil(count / params.length);
        }

        debug(count, params.length, params);
        // length = 0;
        this.setExecutionInfoValue('childs', params.length);
        await this.beforeSplitResult(params);
    }

    async count(options: any = {}): Promise<any> {
        const service = this.getLocalService();
        return await service.count(options);
    }

    // #region optional
    async afterSplitStart(): Promise<void> {
        null;
    }

    async beforeSplitEnd(): Promise<void> {
        null;
    }

    async up(): Promise<any> {
        return null;
    }

    async down(): Promise<any> {
        return null;
    }

    abstract getLocalService();
    // #endregion

    // #region legacy code
    async findSplitStageExecutionList() {
        return this.findChildStageExecutionList();
    }

    // #endregion
}
applyMixins(ParallelWorkerGeneric, [SplitMixin]);
export interface ParallelWorkerGeneric extends SplitMixin {}
