import _debug from 'debug';
const debug = _debug('worker:stage:ParallelWorker');
import { defaultsDeep, omit } from 'lodash';

import { applyMixins } from 'node-common/dist/utils/mixin';
import { StageStatusEnum } from '../../../types/stageStatus.type';
import { ResultInterface } from '../../../interfaces/result.interface';
import { SplitMixin } from './split.mixin';

export abstract class ParallelWorkerGeneric {
    limitRows = 1000;

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
        return [this['rootDir'], this['stageConfig'].config.splitStage].join('/');
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
        this['splitStageOptions'] = {
            ...(this['splitStageOptions'] || {}),
            ...omit(params, 'length', 'count'),
        };
    }

    defineLimits(options) {
        const bulkLimit = !this['isProjectConfigActivated']('limitRows') ? options.bulkLimit : this.limitRows;
        return { bulkLimit };
    }

    /* replace methods bellow if needed */
    async beforeSplitStart() {
        const options = this['prepareOptions']();
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
