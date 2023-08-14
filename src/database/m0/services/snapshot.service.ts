import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { CrudService } from 'node-common/dist/services/crud.service';
import { DynamicDatabase } from 'node-common/dist/services/dynamicDatabase.service';

import { MODULE } from '../../../types/module.type';
import { SnapshotEntity } from '../entities/snapshot.entity';

@Injectable()
export class SnapshotService extends DynamicDatabase<SnapshotEntity> {
    protected idAttribute = 'uid';

    constructor(
        @InjectDataSource(MODULE.M0) protected dataSource: DataSource,
        @InjectRepository(SnapshotEntity, MODULE.M0) protected readonly repository,
    ) {
        super();
    }

    async findByTransactionAndModule(transactionUid: string, moduleUid: string): Promise<object> {
        const uid = [transactionUid, moduleUid].join('/');
        return await this.findById(uid);
    }
}
