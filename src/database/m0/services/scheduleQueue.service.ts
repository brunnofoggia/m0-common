import { LessThanOrEqual } from 'typeorm';
import { DynamicDatabase } from 'node-labs/lib/services/dynamicDatabase.service';

import { ScheduleQueueEntity } from '../entities/scheduleQueue.entity';

export class ScheduleQueueService extends DynamicDatabase<ScheduleQueueEntity> {
    protected entity = ScheduleQueueEntity;

    async findByDate(date: Date, options: any = {}): Promise<ScheduleQueueEntity[]> {
        return await this.find({
            ...options,
            where: {
                ...options.where,
                date: LessThanOrEqual(date),
            },
            order: {
                id: 'ASC',
            },
        });
    }
}
