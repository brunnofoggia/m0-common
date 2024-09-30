import { DynamicDatabase } from 'node-labs/lib/services/dynamicDatabase.service';

import { ModuleEntity } from '../entities/module.entity';

export class ModuleService extends DynamicDatabase<ModuleEntity> {
    protected override entity = ModuleEntity;
    protected override idAttribute = 'uid';

    override async findById(id: number | string, options: any = {}): Promise<ModuleEntity> {
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
