import { GenericInterface } from 'node_common/dist/interfaces/generic.interface';

import { StageStatusEnum } from '../types/stageStatus.type';
import { ModuleExecutionInterface } from './moduleExecution.interface';

export interface StageExecutionInterface extends GenericInterface {
    moduleExecutionId: number;
    stageConfigId: number;
    data?: {
        [key: string]: any;
    };
    error?: any[];
    statusUid: StageStatusEnum;
    moduleExecution?: ModuleExecutionInterface;
}
