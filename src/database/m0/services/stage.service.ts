import { DynamicDatabase } from 'node-common/dist/services/dynamicDatabase.service';

import { StageEntity } from '../entities/stage.entity';

export class StageService extends DynamicDatabase<StageEntity> {
    protected entity = StageEntity;
    protected idAttribute = 'uid';
}
