import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import { set } from 'node-common/dist/utils/entities';

import { TimestampEntity } from 'node-common/dist/entities/timestamp';
import { EnterpriseEntity } from './enterprise.entity';
import { ModuleConfigEntity } from './moduleConfig.entity';
import { ModuleExecutionEntity } from './moduleExecution.entity';
import { MODULE } from '../../../types/module.type';

@Entity({ name: 'project', schema: MODULE.M0 })
export class ProjectEntity extends TimestampEntity {
    @PrimaryColumn({ name: 'uid' })
    uid: string;

    @Column({ name: 'enterprise_uid' })
    enterpriseUid: string;

    @Column({ name: 'name' })
    name: string;

    @Column(set({ name: 'config', type: 'jsonb' }))
    config: JSON;

    @ManyToOne(() => EnterpriseEntity, (enterprise) => enterprise.projects)
    @JoinColumn({ name: 'enterprise_uid' })
    enterprise: EnterpriseEntity;

    @OneToMany(() => ModuleConfigEntity, (modulesConfig) => modulesConfig.project)
    modulesConfig: ModuleConfigEntity[];

    @OneToMany(() => ModuleExecutionEntity, (modulesExecution) => modulesExecution.project)
    modulesExecution: ModuleExecutionEntity[];
}
