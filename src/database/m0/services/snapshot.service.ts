import { DynamicDatabase } from 'node-common/dist/services/dynamicDatabase.service';

import { SnapshotEntity } from '../entities/snapshot.entity';

export class SnapshotService extends DynamicDatabase<SnapshotEntity> {
    protected entity = SnapshotEntity;
    protected idAttribute = 'uid';

    async findByTransactionAndModule(transactionUid: string, moduleUid: string): Promise<object> {
        const uid = [transactionUid, moduleUid].join('/');
        return await this.findById(uid);
    }
}
