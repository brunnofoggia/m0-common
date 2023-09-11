import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { GenericEntity } from 'node-common/dist/entities/generic';
import { set } from 'node-common/dist/utils/entities';

import { ModuleExecutionEntity } from './moduleExecution.entity';
import { StageConfigEntity } from './stageConfig.entity';
import { ModuleEntity } from './module.entity';
import { ProjectEntity } from './project.entity';
import { MODULE } from '../../../types/module.type';

@Entity({ name: 'module_config', schema: MODULE.M0 })
export class ModuleConfigEntity extends GenericEntity {
    @Column({ name: 'module_uid' })
    moduleUid: string;

    @Column({ name: 'project_uid' })
    projectUid: string;

    @Column(set({ name: 'config', type: 'jsonb', default: {} }))
    config?: JSON;

    @ManyToOne(() => ModuleEntity, (module) => module.modulesConfig)
    @JoinColumn({ name: 'module_uid' })
    module: ModuleEntity;

    @ManyToOne(() => ProjectEntity, (project) => project.modulesConfig)
    @JoinColumn({ name: 'project_uid' })
    project: ProjectEntity;

    @OneToMany(() => StageConfigEntity, (stages) => stages.moduleConfig)
    stagesConfig: StageConfigEntity[];

    @OneToMany(() => ModuleExecutionEntity, (modulesExecution) => modulesExecution.moduleConfig)
    modulesExecution: ModuleExecutionEntity[];
}
