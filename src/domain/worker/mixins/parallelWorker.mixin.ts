import _debug from 'debug';
const debug = _debug('worker:stage:ParallelWorker');
import { defaultsDeep } from 'lodash';

import { applyMixins } from 'node-common/dist/utils/mixin';
import { StageStatusEnum } from '../../../types/stageStatus.type';
import { ResultInterface } from '../../../interfaces/result.interface';
import { SplitMixin } from './split.mixin';

export class ParallelWorkerGeneric {
    protected limitRows = 1000;
    protected splitStageOptions: any = {};

    public defaultConfig = {
        bulkLimit: 50000,
        lengthLimit: 0,
    };

    /* do not replace methods bellow */
    /* split lifecycle */
    public async afterSplitEnd(): Promise<void> {
        await this.down();
    }

    public async execute(): Promise<ResultInterface> {
        try {
            return await this['splitExecute']({
                stateService: this['getStateService'](),
                lengthKeyPrefix: this.getLengthKeyPrefix(),
            });
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

    protected async beforeSplitResult(length: number, options: any = {}) {
        const stateService = this['getStateService']();
        await stateService.save(this.getLengthKey(), +length);
        this.splitStageOptions = options;
    }

    protected defineLimits(config) {
        const bulkLimit = !this['isProjectConfigActivated']('limitRows') ? config.bulkLimit : this.limitRows;
        return { bulkLimit };
    }

    /* replace methods bellow if needed */
    protected async beforeSplitStart() {
        const config = this.prepareConfig(this['stageConfig'].config);
        await this.up();
        const { bulkLimit } = this.defineLimits(config);

        let length = 0;
        let count = 0;

        count = await this.count();
        // debug('count', count);

        length = Math.ceil(count / bulkLimit);
        const options: any = {};
        options.totalLimit = bulkLimit;
        if (config.lengthLimit && length > config.lengthLimit) {
            length = config.lengthLimit;
            options.totalLimit = Math.ceil(count / length);
        }

        debug(count, length, options);
        // length = 0;
        await this.beforeSplitResult(length, options);
    }

    protected async count(options: any = {}) {
        const service = this.getLocalService();
        return await service.count(options);
    }

    protected prepareConfig(stageConfig) {
        return (this['stageConfig'].config = defaultsDeep({}, this.defaultConfig, stageConfig, this['stageExecution'].data));
    }

    /* virtual */
    protected async up(): Promise<any> {
        return null;
    }

    protected async down(): Promise<any> {
        return null;
    }

    protected getLocalService(): any {
        return null;
    }
}

applyMixins(ParallelWorkerGeneric, [SplitMixin]);
