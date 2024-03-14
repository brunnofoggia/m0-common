import _debug from 'debug';
const debug = _debug('worker:mixin:PartWorkerGeneric');

import { queuelize } from 'node-labs/lib/utils';

import { ResultInterface } from '../../../interfaces/result.interface';
import { defaultsDeep } from 'lodash';
import { StageWorker } from '../stage.worker';

export abstract class PartWorkerGeneric {
    [x: string]: any;

    public getDefaultOptions() {
        const defaultOptions = defaultsDeep({}, this.defaultOptions, {
            totalLimit: 50000,
            pageLimit: 1000,
            _testOnePage: false,
            _testOneRow: false,
        });
        return defaultOptions;
    }

    /* execution */
    public async execute(): Promise<ResultInterface> {
        const { index, instance, loop } = await this.setupVariables();

        this.setExecutionInfoValue('lines', 0);
        const execute = async (params) => {
            const page = params.page;
            return await this.processExecution({ index, instance, loop, page });
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

        return this.statusDone();
    }

    async processExecution({ index, instance, loop, page }): Promise<boolean | void> {
        const skip = this.loopCalcSkip({ index, page, loop });
        debug('page', page, 'skip: ', skip);

        const rows = await this.paginateRecords(instance.localService, skip, loop.pageLimit);
        if (!rows.length) {
            return;
        }

        this.increaseExecutionInfoValue('lines', rows.length);
        return await this.processQueue({ page, skip, instance, loop, rows });
    }

    /* variables */
    public async setupVariables() {
        const index = +this.getIndex();
        return { index, instance: await this.instanceVariables(), loop: await this.loopVariables() };
    }

    instanceVariables(): any {
        const localService = this.getLocalService();

        return { localService };
    }

    public async loopVariables() {
        const index = +this.getIndex();

        // loop variables
        const { totalLimit, pageLimit } = this.loopLimitVariables();
        const count = await this.count(index * totalLimit, totalLimit);
        debug('total records available', count);
        const totalPages = Math.ceil(count / pageLimit);
        debug('totalLimit', totalLimit, 'count', count, 'pageLimit', pageLimit, 'totalPages', totalPages);

        return { totalLimit, pageLimit, count, totalPages };
    }

    loopLimitVariables() {
        const options = this.stageConfig.options;
        const totalLimit = +options.totalLimit;
        const pageLimit = +(totalLimit && options.pageLimit >= totalLimit ? totalLimit / 10 : options.pageLimit);
        debug({ totalLimit, pageLimit });
        return { totalLimit, pageLimit };
    }

    loopCalcSkip({ index, page, loop }) {
        return +index * loop.totalLimit + page * loop.pageLimit;
    }

    /* virtual methods */
    getLocalService(): any {
        return null;
    }

    async count(skip, take) {
        return 0;
    }

    async paginateRecords(service, skip, take) {
        return [];
    }

    async processQueue({ page, skip = null, instance, loop, rows }): Promise<any> {
        debug('processing page', page);
        await this.beforeEachQueue({ page });
        rows = await this.composeRowsData({ instance, rows });

        let error;
        let lastResult: any;
        try {
            for (const index in rows) {
                // const row = rows[index];
                const data = await this.transformRow({ page, instance, index, row: rows[index] });
                lastResult = data !== false && (await this.processRow({ page, instance, index, row: data })) !== false;
                if (this.stageConfig.options._testOneRow || lastResult === false) break;
            }
        } catch (error_) {
            error = error_;
        }

        await this.afterEachQueue({ page, error });
        if (error) throw error;

        if (this.stageConfig.options._testOnePage || lastResult === false) return false;
        return true;
    }

    async composeRowsData({ instance, rows }) {
        return rows;
    }

    async transformRow({ page, instance, index, row }): Promise<any> {
        return row;
    }

    async processRow({ page, instance, index, row }): Promise<any> {
        null;
    }

    async beforeQueue(params): Promise<any> {
        null;
    }

    async beforeEachQueue(params): Promise<any> {
        null;
    }

    async afterQueue(params): Promise<any> {
        null;
    }

    async afterEachQueue(params): Promise<any> {
        null;
    }
}

export interface PartWorkerGeneric extends StageWorker {}
