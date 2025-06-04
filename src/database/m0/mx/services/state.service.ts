import { MODULE } from '../../../../types/module.type';
import { StateService as _StateService } from '../../../../domain/worker/services/state.service';
import { StateEntity } from '../entities/state.entity';

export class StateService extends _StateService<StateEntity> {
    protected override databaseAlias = MODULE.M0;
    protected override entity = StateEntity;
}

export { StateEntity };
