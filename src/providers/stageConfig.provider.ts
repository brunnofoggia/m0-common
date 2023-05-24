import { throwHttpException } from 'node_common/dist/utils/errors';

import { ERROR } from '../types/error.type';
import { M0ApiProvider } from './m0Api.provider';

export class StageConfigProvider extends M0ApiProvider {
    static basePath = 'm0/stageConfig';

    static async findNames() {
        const url = [this.basePath, 'findNames'].join('/');
        const data = (await this.fetch({ url })).data;

        return data;
    }

    static async findConfig(transactionUid: string, stageUid: string) {
        if (!transactionUid) throwHttpException(ERROR.TRANSACTIONUID_EMPTY);
        const url = [this.basePath, 'findByTransactionAndTargetModuleAndStage', transactionUid, stageUid].join('/');
        const data = (await this.fetch({ url })).data;

        return data;
    }
}
