import _debug from 'debug';
const debug = _debug('worker:stage:CursorParallelWorker');
import { cloneDeep, defaultsDeep, isArray } from 'lodash';
import { Order } from 'typeorm-cursor-pagination';

import { ParallelWorkerGeneric } from './parallelWorker.mixin';
import { countQueryBuilder } from '../../../utils/service';
import { StageWorker } from '../stage.worker';

export interface PaginatorOptions {
    alias: string;
    orderDirection: Order;
    paginationKeys: any[];
    paginationKeyString: string;
    cursorKey: string;
    avoidOrderBy: boolean;
}

export abstract class CursorParallelGeneric extends ParallelWorkerGeneric {
    override async count(options: any = {}): Promise<any> {
        const localService = this.getLocalService();
        const queryFindBuilder = this.countRecordsQueryBuilder(localService);

        if (options.skip) queryFindBuilder.offset(options.skip);
        if (options.take) queryFindBuilder.limit(options.take);

        const count = await countQueryBuilder(localService, queryFindBuilder);
        return count;
    }

    getPaginatorOptions(): Partial<PaginatorOptions> {
        return defaultsDeep({}, this.stageConfig.options.paginator, this.parentStageConfig?.options?.paginator);
    }

    getPaginationKeys() {
        let keys = ['id'];
        const paginatorOptions = this.getPaginatorOptions();

        if (paginatorOptions.paginationKeys) {
            const _keys = paginatorOptions.paginationKeys;
            keys = isArray(_keys) ? _keys : [_keys];
        }
        return keys;
    }

    getCursorKey() {
        const paginatorOptions = this.getPaginatorOptions();
        const keys = this.getPaginationKeys();
        const key = paginatorOptions.cursorKey || (keys.length === 1 ? keys[0] : 'id');
        return key;
    }

    countRecordsQueryBuilder(localService) {
        return this.paginateRecordsQueryBuilder(localService);
    }

    abstract paginateRecordsQueryBuilder(service);
    abstract getLocalEntity();
}

export interface CursorParallelGeneric extends StageWorker {}
