import { throwHttpException } from 'node_common/dist/utils/errors';
import { ApiProvider } from 'node_common/dist/providers/api.provider';
import { ERROR } from '../types/error.type';

export class ModuleConfigProvider extends ApiProvider {
    static baseUrl = process.env.M0_API;
    static basePath = 'm0/moduleConfig';

    static async findConfig(transactionUid: string, moduleUid: string) {
        if (!transactionUid) throwHttpException(ERROR.TRANSACTIONUID_EMPTY);
        const url = [this.basePath, 'findByTransactionAndTargetModule', transactionUid, moduleUid].join('/');
        const data = (await this.fetch({ url })).data;

        return data;
    }
}
