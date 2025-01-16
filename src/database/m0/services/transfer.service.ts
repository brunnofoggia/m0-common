import { Like } from 'typeorm';
import { DynamicDatabase } from 'node-labs/lib/services/dynamicDatabase.service';

import { TransferEntity } from '../entities/transfer.entity';
import { TransferInterface } from '../../../interfaces/transfer.interface';

export class TransferService extends DynamicDatabase<TransferEntity> {
    protected override entity = TransferEntity;
    protected override idAttribute = 'uid';

    async findAllByPrefix(prefix: number | string): Promise<TransferInterface[]> {
        return await this.find({ where: { uid: Like(prefix + '%') } });
    }

    async removeAllByPrefix(prefix: number | string): Promise<any> {
        return await this.getRepository().delete({ uid: Like(prefix + '%') });
    }
}
