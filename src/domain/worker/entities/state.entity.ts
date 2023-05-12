import { Column, PrimaryColumn } from 'typeorm';

export class StateEntity {
    @PrimaryColumn({ name: 'key', type: "varchar" })
    key: string;

    @Column({ name: 'value', type: "varchar" })
    value: string;
}
