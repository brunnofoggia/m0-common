import { DynamicDatabase } from 'node-labs/lib/services/dynamicDatabase.service';

import { StageConfigEntity } from '../entities/stageConfig.entity';

export class StageConfigService extends DynamicDatabase<StageConfigEntity> {
    protected override entity = StageConfigEntity;

    async findScheduleByConfig(config: any = {}): Promise<StageConfigEntity[]> {
        const queryBuilder = this.getRepository()
            .createQueryBuilder('stageConfig')
            .innerJoinAndSelect('stageConfig.moduleConfig', 'moduleConfig');

        for (const [key, value] of Object.entries(config)) {
            const data: any = {};
            data[key] = {}; // *dynamic parameter name* with the trigger config json
            data[key][key] = value; // key and value to filter

            queryBuilder.andWhere(`stageConfig.config ::jsonb @> :${key}`, data);
        }

        return await queryBuilder.getMany();
    }

    async findAllByProject(projectUid: string): Promise<StageConfigEntity[]> {
        const queryBuilder = this.getRepository()
            .createQueryBuilder('stageConfig')
            .innerJoinAndSelect('stageConfig.moduleConfig', 'moduleConfig')
            .where('moduleConfig.projectUid = :projectUid', { projectUid });

        return await queryBuilder.getMany();
    }
}
