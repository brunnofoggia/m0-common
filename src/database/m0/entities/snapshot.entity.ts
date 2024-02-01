import { Column, Entity, PrimaryColumn } from 'typeorm';

import { MODULE } from '../../../types/module.type';
import { set } from 'node-labs/lib/utils/entities';

@Entity({ name: 'snapshot', schema: MODULE.M0 })
export class SnapshotEntity {
    @PrimaryColumn({ name: 'uid' })
    uid: string;

    @Column(set({ name: 'data', type: 'jsonb', default: {} }))
    data: any;
}
