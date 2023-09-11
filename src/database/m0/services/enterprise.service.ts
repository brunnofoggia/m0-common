import { CrudService } from 'node-common/dist/services/crud.service';

import { EnterpriseEntity } from '../entities/enterprise.entity';

export class EnterpriseService extends CrudService<EnterpriseEntity> {
    protected entity = EnterpriseEntity;
    protected idAttribute = 'uid';
}
