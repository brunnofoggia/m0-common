import { Column, Entity, PrimaryColumn } from 'typeorm';

import { MODULE } from '../../../types/module.type';

@Entity({ name: 'transfer', schema: MODULE.M0 })
export class TransferEntity {
    @PrimaryColumn({ name: 'uid', type: 'varchar' })
    uid: string;

    @Column({ name: 'text', type: 'text' })
    text: string;
}
