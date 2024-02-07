import { throwHttpException } from 'node-labs/lib/utils/errors';

import { ERROR } from '../types/error.type';
import { M0ApiProvider } from './m0Api.provider';

export class ModuleExecutionProvider extends M0ApiProvider {
    static basePath = 'm0/moduleExecution';

    static async findIdByTransactionAndModuleUid(transactionUid: string, moduleUid: string) {
        const url = [this.basePath, 'findIdByTransactionAndModuleUid', transactionUid, moduleUid].join('/');
        const result = (await this.request({ url })).data;

        return result;
    }

    static async create({ projectUid, moduleUid = '', moduleConfigId = '', date = '', transactionUid = '', data = {} }) {
        const url = [this.basePath, '?find=1'].join('/');
        if (!projectUid && !transactionUid) throwHttpException(ERROR.NOT_ENOUGH_DATA);

        const _data = {
            moduleConfigId,
            moduleUid,
            projectUid,
            date: (date ? new Date(date) : new Date()).toISOString(),
            transactionUid,
            data,
        };

        return (
            await this.request({
                method: 'post',
                url,
                data: _data,
            })
        ).data;
    }
}
