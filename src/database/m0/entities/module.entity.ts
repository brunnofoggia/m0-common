import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { TimestampEntity } from 'node-labs/lib/entities/timestamp';

import { StageEntity } from './stage.entity';
import { ModuleConfigEntity } from './moduleConfig.entity';
import { MODULE } from '../../../types/module.type';

@Entity({ name: 'module', schema: MODULE.M0 })
export class ModuleEntity extends TimestampEntity {
    @PrimaryColumn({ name: 'uid' })
    uid: string;

    @Column({ name: 'name' })
    name: string;

    @OneToMany(() => StageEntity, (stages) => stages.module)
    stages: StageEntity[];

    @OneToMany(() => ModuleConfigEntity, (modulesConfig) => modulesConfig.module)
    modulesConfig: ModuleConfigEntity[];
}
