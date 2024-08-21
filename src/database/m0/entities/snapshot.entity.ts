import { Column, Entity, PrimaryColumn } from 'typeorm';
import { TimestampEntity } from 'node-labs/lib/entities/timestamp';
import { set } from 'node-labs/lib/utils/entities';

import { MODULE } from '../../../types/module.type';

@Entity({ name: 'snapshot', schema: MODULE.M0 })
export class SnapshotEntity extends TimestampEntity {
    @PrimaryColumn({ name: 'uid' })
    uid: string;

    @Column(set({ name: 'data', type: 'jsonb', default: {} }))
    data: any;
}
