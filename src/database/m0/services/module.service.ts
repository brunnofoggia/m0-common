import { DynamicDatabase } from 'node-common/dist/services/dynamicDatabase.service';

import { ModuleEntity } from '../entities/module.entity';

export class ModuleService extends DynamicDatabase<ModuleEntity> {
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
