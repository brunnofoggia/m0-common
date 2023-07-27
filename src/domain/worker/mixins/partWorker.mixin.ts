import _debug from 'debug';
const debug = _debug('worker:mixin:PartWorker');

import { queuelize } from 'node-common/dist/utils';

import { ResultInterface } from '../../../interfaces/result.interface';

export class PartWorkerGeneric {
    protected defaultConfig: any = {
        totalLimit: 50000,
        pageLimit: 1000,
    };

    /* execution */
    public async execute(): Promise<ResultInterface> {
        const { index, instance, loop } = await this.setupVariables();

        const execute = async (params) => {
            const page = params.page;
            await this.processExecution({ index, instance, loop, page });
        };

        // will execute while condition is true
        const condition = (params) => ++params.page < loop.totalPages;
        // loop counter lives inside this object and the object is passed on each execution
        const params: any = { page: -1 };
        // executions will run one at a time
        await queuelize(condition, execute, { async: 0, params });

        return this['statusDone']();
    }

    protected async processExecution({ index, instance, loop, page }) {
        const skip = this.loopCalcSkip({ index, page, loop });
        debug('page', page, 'skip: ', skip);

        const rows = await this.paginateRecords(instance.localService, skip, loop.pageLimit);
        if (!rows.length) {
            return;
        }

        await this.processQueue({ page, skip, instance, loop, rows });
    }

    /* variables */
    public async setupVariables() {
        this['prepareConfig'](this['stageConfig'].config);
        const index = this['getIndex']();

        return { index, instance: await this.instanceVariables(), loop: await this.loopVariables() };
    }

    protected instanceVariables(): any {
        const localService = this.getLocalService();

        return { localService };
    }

    public async loopVariables() {
        const index = this['getIndex']();

        // loop variables
        const { totalLimit, pageLimit } = this.loopLimitVariables();
        const count = await this.count(+index * totalLimit, totalLimit);
        debug('total records available', count);
        const totalPages = Math.ceil(count / pageLimit);
        debug('totalLimit', totalLimit, 'count', count, 'pageLimit', pageLimit, 'totalPages', totalPages);

        return { totalLimit, pageLimit, count, totalPages };
    }

    protected loopLimitVariables() {
        const config = this['stageConfig'].config;
        const totalLimit = config.totalLimit;
        const pageLimit = config.pageLimit >= totalLimit ? totalLimit / 10 : config.pageLimit;
        debug({ totalLimit, pageLimit });
        return { totalLimit, pageLimit };
    }

    protected loopCalcSkip({ index, page, loop }) {
        return +index * loop.totalLimit + page * loop.pageLimit;
    }

    /* virtual methods */
    protected getLocalService(): any {
        return null;
    }

    protected async count(skip, take) {
        return 0;
    }

    protected async paginateRecords(service, skip, take) {
        return [];
    }

    protected async processQueue({ page, skip, instance, loop, rows }) {
        null;
    }
}
