import { DynamicDatabase } from 'node-labs/lib/services/dynamicDatabase.service';

import { ProjectEntity } from '../entities/project.entity';

export class ProjectService extends DynamicDatabase<ProjectEntity> {
    protected entity = ProjectEntity;
    protected idAttribute = 'uid';

    async findById(id: number | string, options: any = {}): Promise<ProjectEntity> {
        const result = await super.findById(id, {
            ...options,
            relations: {
                ...options.relations,
                enterprise: true,
            },
        });

        return result;
    }
}
