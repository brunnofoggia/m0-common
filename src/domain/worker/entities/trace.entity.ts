import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'trace' })
export class TraceEntity {
    @PrimaryColumn({ name: 'key', type: 'varchar' })
    key: string;

    @Column({ name: 'value', type: 'jsonb' })
    value: any;
}
