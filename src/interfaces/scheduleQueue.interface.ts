import { GenericInterface } from 'node_common/dist/interfaces/generic.interface';

export interface ScheduleQueueInterface extends GenericInterface {
    queueName: string;
    body: {
        [key: string]: any;
    };
    config: {
        [key: string]: any;
    };
}
