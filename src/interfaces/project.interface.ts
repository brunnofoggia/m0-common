import { TimestampInterface } from 'node_common/dist/interfaces/timestamp.interface';
import { ModuleConfigInterface } from './moduleConfig.interface';
import { ModuleExecutionInterface } from './moduleExecution.interface';
import { EnterpriseInterface } from './enterprise.interface';

export interface ProjectInterface extends TimestampInterface {
    uid: string;
    enterpriseUid: string;
    name: string;
    config?: {
        [key: string]: any;
    };
    _config?: {
        [key: string]: any;
    };
    enterprise?: EnterpriseInterface;
    modulesConfig?: Array<ModuleConfigInterface>;
    modulesExecution?: Array<ModuleExecutionInterface>;
}
