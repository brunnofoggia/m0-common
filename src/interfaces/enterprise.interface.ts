import { TimestampInterface } from 'node-common/dist/interfaces/timestamp.interface';
import { ProjectInterface } from './project.interface';

export interface EnterpriseInterface extends TimestampInterface {
    uid: string;
    name: string;
    config: {
        [key: string]: any;
    };
    data: JSON;
    projects?: Array<ProjectInterface>;
}
