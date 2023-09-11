import { set } from 'node-common/dist/utils/entities';
import { GenericEntity } from 'node-common/dist/entities/generic';
import { MODULE } from '../../../types/module.type';
import { Column, Entity } from 'typeorm';

@Entity({ name: 'schedule_queue', schema: MODULE.M0 })
export class ScheduleQueueEntity extends GenericEntity {
    @Column({ name: 'queue_name' })
    queueName: string;

    @Column(set({ name: 'body', type: 'jsonb', default: {} }))
    body: JSON;

    @Column(set({ name: 'config', type: 'jsonb' }))
    config: JSON;

    @Column(set({ name: 'date', type: 'timestamptz' }))
    date: Date;
}
