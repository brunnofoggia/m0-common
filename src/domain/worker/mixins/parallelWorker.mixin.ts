import _debug from 'debug';
const debug = _debug('worker:stage:ParallelWorker');
import { defaultsDeep, omit } from 'lodash';

import { applyMixins } from 'node-common/dist/utils/mixin';
import { StageStatusEnum } from '../../../types/stageStatus.type';
import { ResultInterface } from '../../../interfaces/result.interface';
import { SplitMixin } from './split.mixin';

export abstract class ParallelWorkerGeneric {
    protected limitRows = 1000;
    protected splitStageOptions: any = {};

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

    public async execute(): Promise<ResultInterface> {
        try {
            return await this['splitExecute'](this['splitExecuteOptions']());
        } catch (error) {
            this['logError'](error);
            return { statusUid: StageStatusEnum.FAILED, errorMessage: error.message };
        }
    }

    protected getLengthKeyPrefix() {
        return [this['rootDir'], this['stageConfig'].config.splitStage].join('/');
    }

    protected getLengthKey() {
        return [this.getLengthKeyPrefix(), 'length'].join('/');
    }

    protected async getLengthValue() {
        const stateService = this['getStateService']();
        return await stateService.getValue(this.getLengthKey());
    }

    protected async setLengthValue(value: number) {
        const stateService = this['getStateService']();
        await stateService.save(this.getLengthKey(), value);
    }

    protected async beforeSplitResult(params: any = {}) {
        await this.setLengthValue(+params.length);
        this.splitStageOptions = {
            ...(this.splitStageOptions || {}),
            ...omit(params, 'length', 'count'),
        };
    }

    protected defineLimits(options) {
        const bulkLimit = !this['isProjectConfigActivated']('limitRows') ? options.bulkLimit : this.limitRows;
        return { bulkLimit };
    }

    /* replace methods bellow if needed */
    protected async beforeSplitStart() {
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

    protected async count(options: any = {}) {
        const service = this.getLocalService();
        return await service.count(options);
    }

    /* optional */
    protected async up(): Promise<any> {
        return null;
    }

    protected async down(): Promise<any> {
        return null;
    }

    abstract getLocalService();
}

applyMixins(ParallelWorkerGeneric, [SplitMixin]);
