import { GenericInterface } from 'node-labs/lib/interfaces/generic.interface';

export interface StageConfigInterface extends GenericInterface {
    moduleConfigId: number;
    stageUid: string;
    config?: {
        [key: string]: any;
    };
    options?: {
        [key: string]: any;
    };
}
