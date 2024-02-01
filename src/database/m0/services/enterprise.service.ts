import { DynamicDatabase } from 'node-labs/lib/services/dynamicDatabase.service';

import { EnterpriseEntity } from '../entities/enterprise.entity';

export class EnterpriseService extends DynamicDatabase<EnterpriseEntity> {
    protected entity = EnterpriseEntity;
    protected idAttribute = 'uid';
}
