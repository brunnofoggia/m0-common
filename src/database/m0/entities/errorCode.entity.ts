import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';

import { StageExecutionEntity } from './stageExecution.entity';
import { MODULE } from '../../../types/module.type';

@Entity({ name: 'error_code', schema: MODULE.M0 })
export class ErrorCodeEntity {
    @PrimaryColumn()
    uid: string;

    @Column({ name: 'name' })
    name: string;
}
