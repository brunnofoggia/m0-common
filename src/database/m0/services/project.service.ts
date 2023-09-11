import { CrudService } from 'node-common/dist/services/crud.service';
import { ProjectEntity } from '../entities/project.entity';

export class ProjectService extends CrudService<ProjectEntity> {
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
