import { CrudService } from 'node-common/dist/services/crud.service';
import { StageEntity } from '../entities/stage.entity';

export class StageService extends CrudService<StageEntity> {
    protected entity = StageEntity;
    protected idAttribute = 'uid';
}
