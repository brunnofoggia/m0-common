import { TimestampInterface } from 'node-labs/lib/interfaces/timestamp.interface';
import { ModuleConfigInterface } from './moduleConfig.interface';
import { StageInterface } from './stage.interface';

export interface ModuleInterface extends TimestampInterface {
    uid: string;
    name: string;
    stages?: Array<StageInterface>;
    modulesConfig?: Array<ModuleConfigInterface>;
}
