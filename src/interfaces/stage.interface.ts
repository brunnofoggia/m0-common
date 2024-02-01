import { TimestampInterface } from 'node-labs/lib/interfaces/timestamp.interface';
import { StageConfigInterface } from './stageConfig.interface';

export interface StageInterface extends TimestampInterface {
    uid: string;
    moduleUid: string;
    name: string;
    stagesConfig?: Array<StageConfigInterface>;
}
