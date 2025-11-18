import { CreatedAtEntity } from 'node-labs/lib/entities/timestamp';
import { Column, PrimaryColumn } from 'typeorm';

export class MonitorEntity extends CreatedAtEntity {
    @PrimaryColumn({ name: 'key', type: 'varchar' })
    key: string;

    @Column({ name: 'value', type: 'varchar' })
    value: string;
}
