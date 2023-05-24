import { throwHttpException } from 'node_common/dist/utils/errors';

import { ERROR } from '../types/error.type';
import { M0ApiProvider } from './m0Api.provider';

export class ModuleConfigProvider extends M0ApiProvider {
    static basePath = 'm0/moduleConfig';

    static async findConfig(transactionUid: string, moduleUid: string) {
        if (!transactionUid) throwHttpException(ERROR.TRANSACTIONUID_EMPTY);
        const url = [this.basePath, 'findByTransactionAndTargetModule', transactionUid, moduleUid].join('/');
        const data = (await this.fetch({ url })).data;

        return data;
    }
}
