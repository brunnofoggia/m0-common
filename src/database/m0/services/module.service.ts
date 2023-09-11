import { CrudService } from 'node-common/dist/services/crud.service';
import { ModuleEntity } from '../entities/module.entity';

export class ModuleService extends CrudService<ModuleEntity> {
    protected entity = ModuleEntity;
    protected idAttribute = 'uid';

    async findById(id: number | string, options: any = {}): Promise<ModuleEntity> {
        const result = await super.findById(id, {
            ...options,
            relations: {
                ...options.relations,
                stages: true,
            },
        });

        return result;
    }
}
