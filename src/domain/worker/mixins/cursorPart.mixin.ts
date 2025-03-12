import _debug from 'debug';
const debug = _debug('worker:stage:CursorPartWorker');

import { bind, size } from 'lodash';
import { Order, PaginatorJoin, PaginatorUtil } from 'typeorm-cursor-pagination';

import { ObjectLiteral } from 'typeorm';
import { CursorParallelGeneric, PaginatorOptions } from './cursorParallel.mixin';
import { WorkerError } from '../error';
import { StageStatusEnum } from '../../../types/stageStatus.type';
import { StageWorker } from '../stage.worker';
import { PartWorkerGeneric } from './partWorker.mixin';

export abstract class CursorPartGeneric {
    abstract getLocalEntity();
    abstract getLocalService();
    abstract paginateRecordsQueryBuilder(service);

    processInfo: any = {};

    paginator: PaginatorUtil<ObjectLiteral>;

    getPaginatorPageLimit() {
        const loop = this.loopLimitVariables();
        return loop.pageLimit;
    }

    getSplitDelimiters() {
        return this.stageConfig.options.cursor;
    }

    public async loopVariables() {
        // loop variables
        const { totalLimit, pageLimit } = this.loopLimitVariables();
        // will keep total in mind but stop after reaching 0 or less then pageLimit
        const count = totalLimit;
        debug('total records available', count);
        if (count % pageLimit > 0)
            throw new WorkerError('invalid totalLimit/pageLimit. one must be multiple of the other', StageStatusEnum.FAILED);

        const totalPages = Math.ceil(count / pageLimit);
        debug('totalLimit', totalLimit, 'count', count, 'pageLimit', pageLimit, 'totalPages', totalPages);

        return { totalLimit, pageLimit, count, totalPages };
    }

    async processExecution({ index, instance, loop, page }): Promise<boolean | void> {
        let _break = false;
        const result = () => !_break;

        const paginator = await this.getPaginator();
        await paginator.hasNext();

        const rows = paginator.data;
        // last page
        if (rows.length < loop.pageLimit) _break = true;
        if (!rows.length) return result();

        this.increaseExecutionInfoValue('lines', rows.length);
        if (!(await this.processQueue({ page, instance, loop, rows }))) _break = true;

        // paginator.data;
        debug('page', page, 'records: ', paginator.data.length);
        return result();
    }

    async findFirstRow() {
        const loop = this.loopLimitVariables();
        const alias = this.getPaginatorOptions().alias;
        const cursorKey = this.getCursorKey();
        const pk = `"${alias}"."${cursorKey}"`;
        const offset = +this.getIndex() * loop.totalLimit;
        const avoidOrderBy = this.getPaginatorOptions().avoidOrderBy;

        // here I find dynamically the first record of the subprocess by using
        // limit to get only one
        // and calculating offset based on index
        // that way I will *AVOID* the mistake of considering id sequence that wont be sequential
        const queryBuilder = this.paginateRecordsQueryBuilder(this.getLocalService());
        queryBuilder.limit(1);
        if (!avoidOrderBy) queryBuilder.orderBy(pk, Order.ASC);
        queryBuilder.offset(offset);

        const row = (await queryBuilder.getRawMany())?.shift() || null;
        debug('first row', row);
        return row;
    }

    async getPaginator() {
        if (!this.paginator) {
            const paginatorOptions = this.getPaginatorOptions();
            const paginationKeys = this.getPaginationKeys();

            const queryBuilder = await this.getPaginatorBuilder();
            const entity = this.getLocalEntity();
            if (!entity) throw new WorkerError('getLocalEntity not configured properly', StageStatusEnum.FAILED);

            this.paginator = new PaginatorUtil(
                {
                    entity,
                    alias: paginatorOptions.alias,
                    paginationKeys,
                    Paginator: PaginatorJoin,
                    query: {
                        limit: this.getPaginatorPageLimit(),
                        order: paginatorOptions.orderDirection || Order.ASC,
                    },
                },
                queryBuilder,
            );
        }

        return this.paginator;
    }

    async getPaginatorBuilder() {
        const paginatorOptions = this.getPaginatorOptions();
        const alias = paginatorOptions.alias;
        const paginationKeyString = paginatorOptions.paginationKeyString || false;

        const cursorKey = this.getCursorKey();
        const pk = `"${alias}"."${cursorKey}"`;

        const queryBuilder = this.paginateRecordsQueryBuilder(this.getLocalService());

        const avoidCursorConditionOnFirstRow = this.stageConfig.options.avoidCursorConditionOnFirstRow;
        const ignoreFirstRowError = this.stageConfig.options.ignoreFirstRowError;

        if (!avoidCursorConditionOnFirstRow) {
            const firstRow = await this.findFirstRow();

            if (firstRow && size(firstRow)) {
                if (firstRow[cursorKey] === undefined)
                    throw new WorkerError('invalid initial cursor value or cursor key field not present', StageStatusEnum.FAILED);

                let value = firstRow[cursorKey];
                if (paginationKeyString) value = `'${value}'`;

                // i did this at first but it makes no sense to capture all the keys
                // const splitDelimiters = this.getSplitDelimiters();
                // const where = `${pk} >= ${splitDelimiters[0]} AND ${pk} <= ${splitDelimiters[1]}`;
                // then I realized that the first row could be calculated using limit and offset (see findFirstRow method)
                const where = `${pk} >= ${value}`;

                queryBuilder.andWhere(where);
            } else if (!ignoreFirstRowError) {
                throw new WorkerError('invalid page. no first row', StageStatusEnum.FAILED);
            }
        }
        return queryBuilder;
    }

    // clone
    getPaginatorOptions(): Partial<PaginatorOptions> {
        return bind(CursorParallelGeneric.prototype.getPaginatorOptions, this)();
    }

    getPaginationKeys() {
        return bind(CursorParallelGeneric.prototype.getPaginationKeys, this)();
    }

    getCursorKey() {
        return bind(CursorParallelGeneric.prototype.getCursorKey, this)();
    }
}

export interface CursorPartGeneric extends PartWorkerGeneric, StageWorker {}
