import { ApiProvider } from 'node_common/dist/providers/api.provider';
import { throwHttpException } from 'node_common/dist/utils/errors';
import { ERROR } from '../types/error.type';

export class ModuleExecutionProvider extends ApiProvider {
    static baseUrl = process.env.M0_API;
    static basePath = 'm0/moduleExecution';

    static async findIdByTransactionAndModuleUid(transactionUid: string, moduleUid: string) {
        const url = [this.basePath, 'findIdByTransactionAndModuleUid', transactionUid, moduleUid].join('/');
        const result = (await this.fetch({ url })).data;

        return result;
    }

    static async create({ projectUid, moduleUid = '', moduleConfigId = '', date = '', transactionUid = '', data = {} }) {
        const url = [this.basePath, '?find=1'].join('/');
        if (!projectUid && !transactionUid) throwHttpException(ERROR.NOT_ENOUGH_DATA);

        const _data = {
            "moduleConfigId": moduleConfigId,
            "moduleUid": moduleUid,
            "projectUid": projectUid,
            "date": (date ? new Date(date) : new Date()).toISOString(),
            "transactionUid": transactionUid,
            "data": data
        };

        return (await this.fetch({
            method: 'post',
            url,
            data: _data
        })).data;
    }
}
