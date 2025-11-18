import { Entity, Unique } from 'typeorm';
import { Column, PrimaryColumn } from 'typeorm';

import { CreatedAtEntity } from 'node-labs/lib/entities/timestamp';

import { MxModuleEnum } from '../types/mxModule';

@Unique(['group', 'name', 'value'])
@Entity({ name: 'counter', schema: MxModuleEnum.FUNCTIONALITY })
export class CounterEntity extends CreatedAtEntity {
    @PrimaryColumn({ name: 'owner', type: 'varchar' })
    owner: string;

    @PrimaryColumn({ name: 'name', type: 'varchar' })
    name: string;

    @Column({ name: 'group', type: 'varchar' })
    group: string;

    @Column({ name: 'value', type: 'bigint' })
    value: number;
}
