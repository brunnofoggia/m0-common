import _debug from 'debug';
const debug = _debug('worker:mixin:PartWorkerGeneric');

import { queuelize } from 'node-common/dist/utils';

import { ResultInterface } from '../../../interfaces/result.interface';
import { defaultsDeep } from 'lodash';

class PartWorkerGeneric {
    public getDefaultOptions() {
        const defaultOptions = defaultsDeep({}, this['defaultOptions'], {
            totalLimit: 50000,
            pageLimit: 1000,
        });
        return defaultOptions;
    }

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
        await queuelize(condition, execute, {
            async: 0,
            params,
            before: (params) => this.beforeQueue(params),
            after: (params) => this.afterQueue(params),
        });

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
        this['prepareOptions']();
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
        const options = this['stageConfig'].options;
        const totalLimit = options.totalLimit;
        const pageLimit = totalLimit && options.pageLimit >= totalLimit ? totalLimit / 10 : options.pageLimit;
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
        debug('processing page', page);
        for (const index in rows) {
            const row = rows[index];
            await this.processRow({ page, instance, index, row });
        }
    }

    protected async processRow({ page, instance, index, row }) {
        null;
    }

    protected async beforeQueue(params) {
        null;
    }

    protected async afterQueue(params) {
        null;
    }
}

export { PartWorkerGeneric };
