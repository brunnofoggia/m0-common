import { DynamicDatabase } from 'node-labs/lib/services/dynamicDatabase.service';

import { ErrorCodeEntity } from '../entities/errorCode.entity';

export class ErrorCodeService extends DynamicDatabase<ErrorCodeEntity> {
    protected entity = ErrorCodeEntity;
    protected idAttribute = 'uid';
}
