import { defaultsDeep, get, set, size, pickBy } from 'lodash';
import Decimal from 'decimal.js';

import { StageStructureProperties } from '../../../../interfaces/stageParts.interface';
import { WorkerError } from '../../error';

export const forwardedResultsPropName = '_forwardedResult';

export abstract class ForwardedMixin {
    abstract executionInfo: any;
    abstract executionError: WorkerError;
    abstract executionStatusUid: any;

    shouldForwardInternalOptions() {
        return (
            this.stageExecution.data.options._forwardInternalOptions ||
            // legacy name
            this.stageExecution.data.options._fowardInternalOptions
        );
    }

    forwardInternalOptions(): any {
        return pickBy(this.stageExecution.data.options, (value, key) => {
            return /^_[a-zA-Z]/.test(key);
        });
    }
}

export abstract class ForwardedResultsMixin {
    abstract executionInfo: any;
    abstract executionError: WorkerError;
    abstract executionStatusUid: any;

    extractForwardedResultsFrom(json) {
        return get(json || {}, forwardedResultsPropName);
    }

    // #region for m0
    mergeForwardedResults(result) {
        let mergedForwardedResults = defaultsDeep({}, this.readForwardedResults() || {});
        const resultForwardedResults = this.extractForwardedResultsFrom(result.info);
        if (resultForwardedResults) {
            // result forwardedResults overrides stageExecution forwardedResults
            mergedForwardedResults = defaultsDeep({}, resultForwardedResults, mergedForwardedResults);
        }
        return mergedForwardedResults;
    }

    setForwardedResultsToTrigger(triggerStageOptions, result: any = {}) {
        const mergedForwardedResults = this.mergeForwardedResults(result);
        if (size(mergedForwardedResults) > 0) {
            triggerStageOptions[forwardedResultsPropName] = mergedForwardedResults;
        }
        return triggerStageOptions;
    }
    // #endregion

    // #region for workers
    _buildForwardedResultValuePath(path) {
        return [forwardedResultsPropName, path].join('.');
    }

    readForwardedResults() {
        return this.extractForwardedResultsFrom(this.stageExecution.data.options);
    }

    getForwardedResultValue(path) {
        const info = this.executionInfo;
        const _path = this._buildForwardedResultValuePath(path);
        return get(info, _path) || get(this.stageExecution.data.options, _path);
    }

    setForwardedResultValue(path, value) {
        set(this.executionInfo, this._buildForwardedResultValuePath(path), value);
    }

    setForwardedResults(json) {
        set(this.executionInfo, forwardedResultsPropName, json);
    }

    increaseForwardedExecutionInfoValue(path, increase: number) {
        const initialValue = this.getForwardedResultValue(path) || 0;
        this.setForwardedResultValue(path, initialValue + increase);
    }

    increaseForwardedDecimalExecutionInfoValue(path, increase: string | number | Decimal) {
        let currentValue = this.getForwardedResultValue(path);
        if (!currentValue || !(currentValue instanceof Decimal)) currentValue = new Decimal(0);

        this.setForwardedResultValue(path, currentValue.plus(increase));
    }
    // #endregion
}

export interface ForwardedMixin extends StageStructureProperties {}
export interface ForwardedResultsMixin extends StageStructureProperties {}
