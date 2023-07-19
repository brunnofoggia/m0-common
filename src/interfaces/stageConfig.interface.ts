import { GenericInterface } from 'node-common/dist/interfaces/generic.interface';

export interface StageConfigInterface extends GenericInterface {
    moduleConfigId: number;
    stageUid: string;
    config?: {
        [key: string]: any;
    };
}
