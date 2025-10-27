import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { TimestampEntity } from 'node-labs/lib/entities/timestamp';
import { set } from 'node-labs/lib/utils/entities';

import { ProjectEntity } from './project.entity';
import { MODULE } from '../../../types/module.type';

@Entity({ name: 'enterprise', schema: MODULE.M0 })
export class EnterpriseEntity extends TimestampEntity {
    @PrimaryColumn({ name: 'uid' })
    uid: string;

    @Column({ name: 'name' })
    name: string;

    @Column(set({ name: 'config', type: 'jsonb' }))
    config: any;

    @Column(set({ name: 'data', type: 'jsonb' }))
    data: any;

    @OneToMany(() => ProjectEntity, (projects) => projects.enterprise)
    projects: ProjectEntity[];
}
