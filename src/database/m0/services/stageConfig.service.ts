import { CrudService } from 'node-common/dist/services/crud.service';
import { StageConfigEntity } from '../entities/stageConfig.entity';

export class StageConfigService extends CrudService<StageConfigEntity> {
    protected entity = StageConfigEntity;

    async findScheduleByConfig(config: any = {}): Promise<StageConfigEntity[]> {
        const queryBuilder = this.getRepository().createQueryBuilder('stageConfig').innerJoinAndSelect('stageConfig.moduleConfig', 'moduleConfig');

        for (const [key, value] of Object.entries(config)) {
            const data: any = {};
            data[key] = {}; // *dynamic parameter name* with the trigger config json
            data[key][key] = value; // key and value to filter

            queryBuilder.andWhere(`stageConfig.config ::jsonb @> :${key}`, data);
        }

        return await queryBuilder.getMany();
    }
}