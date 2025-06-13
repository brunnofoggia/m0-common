import { throwHttpException } from 'node-labs/lib/utils/errors';

import { ERROR } from '../types/error.type';
import { M0ApiProvider, M0ApiProviderV2 } from './m0Api.provider';

export class ModuleConfigProviderV2 extends M0ApiProviderV2 {
    basePath = 'm0/moduleConfig';

    async findConfig(transactionUid: string, moduleUid: string) {
        if (!transactionUid) throwHttpException(ERROR.TRANSACTIONUID_EMPTY);
        const url = [this.basePath, 'findByTransactionAndTargetModule', transactionUid, moduleUid].join('/');
        const data = (await this.request({ url })).data;

        return data;
    }
}

export class ModuleConfigProvider extends M0ApiProvider {
    static instance;

    static async setInstance() {
        if (!this.instance) {
            this.instance = new ModuleConfigProviderV2();
            await this.instance.initialize();
        }
        return this.instance;
    }

    static async findConfig(transactionUid: string, moduleUid: string) {
        await this.setInstance();
        return this.instance.findConfig(transactionUid, moduleUid);
    }
}
