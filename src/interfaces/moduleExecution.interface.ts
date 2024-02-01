import { GenericInterface } from 'node-labs/lib/interfaces/generic.interface';
import { StageExecutionInterface } from './stageExecution.interface';

export interface ModuleExecutionInterface extends GenericInterface {
    projectUid: string;
    moduleConfigId: number;
    transactionUid: string;
    date: Date;
    data?: {
        [key: string]: any;
    };
    stagesExecution?: Array<StageExecutionInterface>;
}
