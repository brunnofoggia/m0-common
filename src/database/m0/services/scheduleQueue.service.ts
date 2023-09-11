import { LessThanOrEqual } from 'typeorm';
import { CrudService } from 'node-common/dist/services/crud.service';

import { ScheduleQueueEntity } from '../entities/scheduleQueue.entity';

export class ScheduleQueueService extends CrudService<ScheduleQueueEntity> {
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
