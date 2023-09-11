import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import { TimestampEntity } from 'node-common/dist/entities/timestamp';

import { ModuleEntity } from './module.entity';
import { StageConfigEntity } from './stageConfig.entity';
import { MODULE } from '../../../types/module.type';

@Entity({ name: 'stage', schema: MODULE.M0 })
export class StageEntity extends TimestampEntity {
    @PrimaryColumn({ name: 'uid' })
    uid: string;

    @Column({ name: 'module_uid' })
    moduleUid: string;

    @Column({ name: 'name' })
    name: string;

    @ManyToOne(() => ModuleEntity, (module) => module.stages)
    @JoinColumn({ name: 'module_uid' })
    module: ModuleEntity;

    @OneToMany(() => StageConfigEntity, (stagesConfig) => stagesConfig.stage)
    stagesConfig: StageConfigEntity[];
}
