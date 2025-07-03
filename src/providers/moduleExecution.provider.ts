import { throwHttpException } from 'node-labs/lib/utils/errors';

import { ERROR } from '../types/error.type';
import { M0ApiProvider, M0ApiProviderV2 } from './m0Api.provider';

export class ModuleExecutionProviderV2 extends M0ApiProviderV2 {
    basePath = 'm0/moduleExecution';

    async findIdByTransactionAndModuleUid(transactionUid: string, moduleUid: string) {
        const url = [this.basePath, 'findIdByTransactionAndModuleUid', transactionUid, moduleUid].join('/');
        const result = (await this.request({ url })).data;

        return result;
    }

    async create({ projectUid, moduleUid = '', moduleConfigId = '', date = '', transactionUid = '', data = {} }) {
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

export class ModuleExecutionProvider extends M0ApiProvider {
    static instance;

    static async setInstance() {
        if (!this.instance) {
            this.instance = new ModuleExecutionProviderV2();
            await this.instance.initialize();
        }
        return this.instance;
    }

    static async findIdByTransactionAndModuleUid(transactionUid: string, moduleUid: string) {
        await this.setInstance();
        return this.instance.findIdByTransactionAndModuleUid(transactionUid, moduleUid);
    }

    static async create({ projectUid, moduleUid = '', moduleConfigId = '', date = '', transactionUid = '', data = {} }) {
        await this.setInstance();
        return this.instance.create({
            projectUid,
            moduleUid,
            moduleConfigId,
            date,
            transactionUid,
            data,
        });
    }
}
