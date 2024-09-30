import { DynamicDatabase } from 'node-labs/lib/services/dynamicDatabase.service';

import { ModuleConfigEntity } from '../entities/moduleConfig.entity';
import { ModuleConfigInterface } from 'interfaces/moduleConfig.interface';

export class ModuleConfigService extends DynamicDatabase<ModuleConfigEntity> {
    protected override entity = ModuleConfigEntity;

    override async findById(id: number | string, options: any = {}): Promise<ModuleConfigEntity> {
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

    async findByProjectUidAndModuleUidWithRelationsAndStageName(
        projectUid: string,
        moduleUid: string,
        withRelations: boolean = false,
        stageName = '',
    ): Promise<ModuleConfigInterface> {
        const where: any = {
            projectUid,
            moduleUid,
        };
        if (stageName) {
            const stageUid = [moduleUid, stageName].join('/');
            where['stagesConfig'] = { stageUid };
        }

        const item: ModuleConfigInterface = (
            await this.find({
                where,
                relations: !withRelations
                    ? {}
                    : {
                          stagesConfig: true,
                      },
            })
        )?.shift() as any;

        if (stageName && item) {
            item.stageConfig = item.stagesConfig.pop() || undefined;
            delete item.stagesConfig;
        }

        return item;
    }
}
