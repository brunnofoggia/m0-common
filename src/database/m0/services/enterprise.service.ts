import { DynamicDatabase } from 'node-labs/lib/services/dynamicDatabase.service';

import { EnterpriseEntity } from '../entities/enterprise.entity';

export class EnterpriseService extends DynamicDatabase<EnterpriseEntity> {
    protected override entity = EnterpriseEntity;
    protected override idAttribute = 'uid';
}
