import { DynamicDatabase } from 'node-labs/lib/services/dynamicDatabase.service';

import { ErrorCodeEntity } from '../entities/errorCode.entity';

export class ErrorCodeService extends DynamicDatabase<ErrorCodeEntity> {
    protected override entity = ErrorCodeEntity;
    protected override idAttribute = 'uid';
}
