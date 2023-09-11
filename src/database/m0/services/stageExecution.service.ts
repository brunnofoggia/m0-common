import { MoreThanOrEqual } from 'typeorm';
import { CrudService } from 'node-common/dist/services/crud.service';

import { StageExecutionEntity } from '../entities/stageExecution.entity';

export class StageExecutionService extends CrudService<StageExecutionEntity> {
    protected entity = StageExecutionEntity;

    async queryBuilderByModuleExecutionAndStageUidAndIndex(queryBuilder, moduleExecutionId: number, stageUid: string, index = -1) {
        queryBuilder.andWhere(`stageExecution.moduleExecutionId = :a`, { a: moduleExecutionId + '' });
        queryBuilder.andWhere(`stageConfig.stageUid = :b`, { b: stageUid });

        if (index > -1) queryBuilder.andWhere(`stageExecution.data ::jsonb @> :c`, { c: { index: index } });

        queryBuilder.orderBy('stageExecution.id', 'DESC');
    }

    async findByModuleExecutionAndStageUidAndIndex(moduleExecutionId: number, stageUid: string, index = -1): Promise<StageExecutionEntity> {
        const queryBuilder = this.getRepository()
            .createQueryBuilder('stageExecution')
            .innerJoinAndSelect('stageExecution.stageConfig', 'stageConfig')
            .innerJoinAndSelect('stageExecution.moduleExecution', 'moduleExecution');
        this.queryBuilderByModuleExecutionAndStageUidAndIndex(queryBuilder, moduleExecutionId, stageUid, index);
        return await queryBuilder['getOne']();
    }

    async findAllByModuleExecutionAndStageUidAndIndex(moduleExecutionId: number, stageUid: string, index = -1): Promise<StageExecutionEntity> {
        const queryBuilder = this.getRepository()
            .createQueryBuilder('stageExecution')
            .innerJoinAndSelect('stageExecution.stageConfig', 'stageConfig')
            .innerJoinAndSelect('stageExecution.moduleExecution', 'moduleExecution');
        this.queryBuilderByModuleExecutionAndStageUidAndIndex(queryBuilder, moduleExecutionId, stageUid, index);
        return await queryBuilder['getMany']();
    }

    async findByModuleExecution(moduleExecutionId: number): Promise<StageExecutionEntity[]> {
        return await this.find({
            where: {
                moduleExecutionId,
            },
        });
    }

    async findByModuleExecutionIdAndStageUidAndDate(moduleExecutionId, date, stageUid, _options: any = {}): Promise<StageExecutionEntity[]> {
        const options: any = {
            ..._options,
            where: {
                moduleExecutionId,
                stageConfig: {
                    stageUid,
                },
                moduleExecution: {
                    date: MoreThanOrEqual(date),
                },
            },
            order: {
                id: 'DESC',
            },
            take: 1,
        };
        const moduleExecutionList = await this.find(options);
        return moduleExecutionList;
    }

    async findOneByModuleExecutionIdAndStageUidAndDate(moduleExecutionId, date, stageUid, options: any = {}) {
        return (
            await this.findByModuleExecutionIdAndStageUidAndDate(moduleExecutionId, date, stageUid, {
                ...options,
                take: 1,
            })
        )?.shift();
    }
}
