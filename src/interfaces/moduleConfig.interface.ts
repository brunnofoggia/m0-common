import { GenericInterface } from 'node_common/dist/interfaces/generic.interface';
import { ModuleExecutionInterface } from './moduleExecution.interface';
import { StageConfigInterface } from './stageConfig.interface';
import { ProjectInterface } from './project.interface';

export interface ModuleConfigInterface extends GenericInterface {
    moduleUid: string;
    projectUid: string;
    stagesConfig?: StageConfigInterface[];
    stageConfig?: StageConfigInterface;
    modulesExecution?: ModuleExecutionInterface[];
    project?: ProjectInterface;
    config?: {
        [key: string]: any;
    };
}
