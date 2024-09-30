import { DynamicDatabase } from 'node-labs/lib/services/dynamicDatabase.service';

import { SnapshotEntity } from '../entities/snapshot.entity';

export class SnapshotService extends DynamicDatabase<SnapshotEntity> {
    protected override entity = SnapshotEntity;
    protected override idAttribute = 'uid';

    async findByTransactionAndModule(projectUid: string, transactionUid: string, moduleUid: string): Promise<object> {
        const uid = [projectUid, transactionUid, moduleUid].join('/');
        return await this.findById(uid);
    }
}
