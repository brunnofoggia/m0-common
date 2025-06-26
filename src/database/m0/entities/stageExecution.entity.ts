import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { GenericEntity } from 'node-labs/lib/entities/generic';
import { set } from 'node-labs/lib/utils/entities';

import { ModuleExecutionEntity } from './moduleExecution.entity';
import { StageConfigEntity } from './stageConfig.entity';
import { MODULE } from '../../../types/module.type';
import { StageStatusEnum } from '../../../types/stageStatus.type';

@Index('stage_execution_idx_0', ['moduleExecutionId', 'statusUid'])
@Entity({ name: 'stage_execution', schema: MODULE.M0 })
export class StageExecutionEntity extends GenericEntity {
    @Column({ name: 'module_execution_id' })
    moduleExecutionId: number;

    @Column(set({ name: 'data', type: 'jsonb', default: {} }))
    data?: JSON;

    @Column(set({ name: 'error', type: 'jsonb', default: [] }))
    error?: JSON;

    @Column(set({ name: 'result', type: 'jsonb', default: [] }))
    result?: JSON;

    @Column(set({ name: 'system', type: 'jsonb', default: {} }))
    system?: JSON;

    @Column({ name: 'stage_config_id' })
    stageConfigId: number;

    @Column(set({ name: 'status_uid', type: 'enum', enum: StageStatusEnum, enumName: 'stage_status', default: StageStatusEnum.INITIAL }))
    statusUid: StageStatusEnum;

    @ManyToOne(() => ModuleExecutionEntity, (moduleExecution) => moduleExecution.stagesExecution)
    @JoinColumn({ name: 'module_execution_id' })
    moduleExecution: ModuleExecutionEntity;

    @ManyToOne(() => StageConfigEntity, (stageConfig) => stageConfig.stagesExecution)
    @JoinColumn({ name: 'stage_config_id' })
    stageConfig: StageConfigEntity;
}
