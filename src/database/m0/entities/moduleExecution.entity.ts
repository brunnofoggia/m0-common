import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { GenericEntity } from 'node-labs/lib/entities/generic';
import { set } from 'node-labs/lib/utils/entities';

import { ModuleConfigEntity } from './moduleConfig.entity';
import { StageExecutionEntity } from './stageExecution.entity';
import { ProjectEntity } from './project.entity';
import { MODULE } from '../../../types/module.type';
import { uuidCheck, uuidGenerate } from '../../../utils/uuid';

@Entity({ name: 'module_execution', schema: MODULE.M0 })
// @Index("transaction_uid-module_config_id-UNIQUE", ["transaction_uid", "module_config_id"], { unique: true })
@Index(['transactionUid'])
@Index(['transactionUid', 'moduleConfig'], { unique: true })
export class ModuleExecutionEntity extends GenericEntity {
    @Column({ name: 'project_uid' })
    projectUid: string;

    @Column({ name: 'module_config_id' })
    moduleConfigId: number;

    @Column(set({ name: 'transaction_uid', default: 'uuid_generate_v4()' }))
    transactionUid?: string;

    @Column(
        set({
            name: 'date',
            type: 'timestamptz',
            default: () => 'CURRENT_TIMESTAMP(6)',
        }),
    )
    date?: Date;

    @Column(set({ name: 'data', type: 'jsonb', default: {} }))
    data?: JSON;

    @ManyToOne(() => ProjectEntity, (project) => project.modulesExecution)
    @JoinColumn({ name: 'project_uid' })
    project: ProjectEntity;

    @ManyToOne(() => ModuleConfigEntity, (moduleConfig) => moduleConfig.modulesExecution)
    @JoinColumn({ name: 'module_config_id' })
    moduleConfig: ModuleConfigEntity;

    @OneToMany(() => StageExecutionEntity, (stagesExecution) => stagesExecution.moduleExecution)
    stagesExecution: StageExecutionEntity[];

    @BeforeInsert()
    generateTransactionUid() {
        if (!uuidCheck(this.transactionUid)) throw new Error('ModuleExecutionEntity: Transaction UID should be provided by domain');
    }
}
