import { DynamicDatabase } from 'node-labs/lib/services/dynamicDatabase.service';

import { ModuleConfigEntity } from '../entities/moduleConfig.entity';

export class ModuleConfigService extends DynamicDatabase<ModuleConfigEntity> {
    protected entity = ModuleConfigEntity;

    async findById(id: number | string, options: any = {}): Promise<ModuleConfigEntity> {
        const result = await super.findById(id, {
            ...options,
            relations: {
                ...options.relations,
                stagesConfig: true,
            },
        });

        return result;
    }

    async findByProjectAndModule(projectUid: string, moduleUid: string): Promise<ModuleConfigEntity> {
        const moduleConfig = (
            await this.find({
                where: {
                    projectUid,
                    moduleUid,
                },
            })
        ).shift();

        return moduleConfig;
    }

    async findScheduleByConfig(): Promise<ModuleConfigEntity[]> {
        const queryBuilder = this.getRepository().createQueryBuilder('moduleConfig');

        queryBuilder.andWhere(`"moduleConfig"."config"->>'schedule' is not null`);

        return await queryBuilder.getMany();
    }
}
