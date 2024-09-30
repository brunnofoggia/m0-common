import { DynamicDatabase } from 'node-labs/lib/services/dynamicDatabase.service';

import { StageEntity } from '../entities/stage.entity';

export class StageService extends DynamicDatabase<StageEntity> {
    protected override entity = StageEntity;
    protected override idAttribute = 'uid';
}
