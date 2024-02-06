import { IsNull, MoreThanOrEqual } from 'typeorm';
import { bind } from 'lodash';

import { DynamicDatabase } from 'node-labs/lib/services/dynamicDatabase.service';

import { StageExecutionEntity } from '../entities/stageExecution.entity';
import { MultipleExecutionMixin } from '../../../domain/worker/mixins/system/multipleExecution.mixin';

export class StageExecutionService extends DynamicDatabase<StageExecutionEntity> {
    protected entity = StageExecutionEntity;

    async addWhereWithModuleExecutionAndStageUidAndExecutionUidAndIndex(
        queryBuilder,
        moduleExecutionId: number,
        stageUid: string,
        executionUid = '',
        index: string | number = -1,
    ) {
        !executionUid && (executionUid = '_');

        queryBuilder.andWhere(`stageExecution.deletedAt IS NULL`);

        queryBuilder.andWhere(`stageExecution.moduleExecutionId = :a`, { a: moduleExecutionId + '' });
        queryBuilder.andWhere(`stageConfig.stageUid = :b`, { b: stageUid });
        queryBuilder.andWhere(`stageExecution.system ::jsonb @> :c`, { c: { executionUid } });

        if (index + '' !== '-1') queryBuilder.andWhere(`stageExecution.data ::jsonb @> :d`, { d: { index: +index } });

        queryBuilder.orderBy('stageExecution.id', 'DESC');
    }

    async findByModuleExecutionAndStageUidAndIndex(
        moduleExecutionId: number,
        stageUid: string,
        executionUid = '',
        index: string | number = -1,
    ): Promise<StageExecutionEntity> {
        const queryBuilder = this.getRepository()
            .createQueryBuilder('stageExecution')
            .innerJoinAndSelect('stageExecution.stageConfig', 'stageConfig')
            .innerJoinAndSelect('stageExecution.moduleExecution', 'moduleExecution');
        this.addWhereWithModuleExecutionAndStageUidAndExecutionUidAndIndex(queryBuilder, moduleExecutionId, stageUid, executionUid, index);
        return await queryBuilder['getOne']();
    }

    async findAllByModuleExecutionAndStageUidAndIndex(
        moduleExecutionId: number,
        stageUid: string,
        executionUid = '',
        index: string | number = -1,
    ): Promise<StageExecutionEntity[]> {
        const queryBuilder = this.getRepository()
            .createQueryBuilder('stageExecution')
            .innerJoinAndSelect('stageExecution.stageConfig', 'stageConfig')
            .innerJoinAndSelect('stageExecution.moduleExecution', 'moduleExecution');
        this.addWhereWithModuleExecutionAndStageUidAndExecutionUidAndIndex(queryBuilder, moduleExecutionId, stageUid, executionUid, index);
        return await queryBuilder['getMany']();
    }

    async findByModuleExecution(moduleExecutionId: number): Promise<StageExecutionEntity[]> {
        return await this.find({
            where: {
                moduleExecutionId,
                deletedAt: IsNull(),
            },
        });
    }

    async findByModuleExecutionIdAndStageUidAndExecutionUid(moduleExecutionId, stageUidAndExecutionUid): Promise<StageExecutionEntity[]> {
        const { stageUid, executionUid } = this.separateStageUidAndExecutionUid(stageUidAndExecutionUid);
        return await this.findAllByModuleExecutionAndStageUidAndIndex(moduleExecutionId, stageUid, executionUid);
    }

    async findOneByModuleExecutionIdAndStageUidAndExecutionUid(moduleExecutionId, stageUidAndExecutionUid) {
        const { stageUid, executionUid } = this.separateStageUidAndExecutionUid(stageUidAndExecutionUid);
        return await this.findByModuleExecutionAndStageUidAndIndex(moduleExecutionId, stageUid, executionUid);
    }

    getStageExecutionSplitter() {
        return bind(MultipleExecutionMixin.prototype.getStageExecutionSplitter, this);
    }

    separateStageUidAndExecutionUid(...args) {
        return bind(MultipleExecutionMixin.prototype.separateStageUidAndExecutionUid, this)(...args);
    }
}
