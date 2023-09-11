import { CrudService } from 'node-common/dist/services/crud.service';
import { ErrorCodeEntity } from '../entities/errorCode.entity';

export class ErrorCodeService extends CrudService<ErrorCodeEntity> {
    protected entity = ErrorCodeEntity;
    protected idAttribute = 'uid';
}
