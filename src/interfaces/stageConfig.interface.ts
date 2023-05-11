import { GenericInterface } from 'node_common/dist/interfaces/generic.interface';

export interface StageConfigInterface extends GenericInterface {
    moduleConfigId: number;
    stageUid: string;
    config?: {
        [key: string]: any;
    };
}
