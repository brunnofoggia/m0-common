import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { GenericEntity } from 'node-labs/lib/entities/generic';
import { set } from 'node-labs/lib/utils/entities';

import { ModuleConfigEntity } from './moduleConfig.entity';
import { StageExecutionEntity } from './stageExecution.entity';
import { StageEntity } from './stage.entity';
import { MODULE } from '../../../types/module.type';

@Entity({ name: 'stage_config', schema: MODULE.M0 })
export class StageConfigEntity extends GenericEntity {
    @Column({ name: 'module_config_id' })
    moduleConfigId: number;

    @Column({ name: 'stage_uid' })
    stageUid: string;

    @Column({ name: 'order', default: 0 })
    order?: number;

    @Column(set({ name: 'config', type: 'jsonb', default: {} }))
    config?: any;

    @Column(set({ name: 'options', type: 'jsonb', default: {} }))
    options?: any;

    @Column({ name: 'description', nullable: true })
    description: string;

    @Column({ name: 'tags', nullable: true })
    tags: string;

    @ManyToOne(() => ModuleConfigEntity, (moduleConfig) => moduleConfig.stagesConfig)
    @JoinColumn({ name: 'module_config_id' })
    moduleConfig: ModuleConfigEntity;

    @ManyToOne(() => StageEntity, (stage) => stage.stagesConfig)
    @JoinColumn({ name: 'stage_uid' })
    stage: StageEntity;

    @OneToMany(() => StageExecutionEntity, (stagesExecution) => stagesExecution.stageConfig)
    stagesExecution: StageExecutionEntity[];
}
