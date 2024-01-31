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
        if (count % pageLimit > 0) throw new WorkerError('invalid totalLimit/pageLimit. one must be multiple of the other', StageStatusEnum.FAILED);

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

        const queryBuilder = this.paginateRecordsQueryBuilder(this.getLocalService());
        queryBuilder.limit(1);
        queryBuilder.orderBy(pk, Order.ASC);
        queryBuilder.offset(+this.getIndex() * loop.totalLimit);

        const row = (await queryBuilder.getRawMany())?.shift() || null;
        debug('first row', row);
        return row;
    }

    async getPaginator() {
        if (!this.paginator) {
            const paginatorOptions = this.getPaginatorOptions();
            const queryBuilder = await this.getPaginatorBuilder();

            this.paginator = new PaginatorUtil(
                {
                    entity: this.getLocalEntity(),
                    alias: paginatorOptions.alias,
                    paginationKeys: this.getPaginationKeys(),
                    Paginator: PaginatorJoin,
                    query: {
                        limit: this.getPaginatorPageLimit(),
                        order: paginatorOptions.orderDirection || Order.ASC,
                    },
                },
                queryBuilder,
            );
            // const cursor: Cursor = this.paginator.setCursorByEntity(firstRow);
            // debug('first cursor', cursor, this.paginator.decodeCursor(cursor.afterCursor));
        }

        return this.paginator;
    }

    async getPaginatorBuilder() {
        const alias = this.getPaginatorOptions().alias;
        const cursorKey = this.getCursorKey();
        const pk = `"${alias}"."${cursorKey}"`;

        const firstRow = await this.findFirstRow();
        if (!firstRow) throw new WorkerError('invalid page. no first row', StageStatusEnum.FAILED);

        const queryBuilder = this.paginateRecordsQueryBuilder(this.getLocalService());

        if (size(firstRow) && firstRow[cursorKey] === undefined)
            throw new WorkerError('invalid initial cursor value or cursor key field not present', StageStatusEnum.FAILED);

        const where = `${pk} >= ${firstRow[cursorKey]}`;
        // const splitDelimiters = this.getSplitDelimiters();
        // const where = `${pk} >= ${splitDelimiters[0]} AND ${pk} <= ${splitDelimiters[1]}`;

        queryBuilder.andWhere(where);
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
