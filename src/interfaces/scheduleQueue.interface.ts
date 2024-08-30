import { GenericInterface } from 'node-labs/lib/interfaces/generic.interface';

export interface ScheduleQueueInterface extends GenericInterface {
    queueName: string;
    body: {
        [key: string]: any;
    };
    config: {
        [key: string]: any;
    };
    date: Date;
    duplicate?: boolean;
    expired?: boolean;
}
