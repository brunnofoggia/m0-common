import { throwHttpException } from 'node-common/dist/utils/errors';

import { ERROR } from '../types/error.type';
import { M0ApiProvider } from './m0Api.provider';

export class SnapshotProvider extends M0ApiProvider {
    static basePath = 'm0/snapshot';

    static async find(transactionUid: string, stageUid: string) {
        if (!transactionUid) throwHttpException(ERROR.TRANSACTIONUID_EMPTY);
        const url = [this.basePath, transactionUid, stageUid].join('/');
        const data = (
            await this.request({
                method: 'get',
                url,
            })
        ).data;

        return data;
    }

    static async save(transactionUid: string, stageUid: string, data = {}) {
        const url = [this.basePath].join('/');

        return (
            await this.request({
                method: 'put',
                url,
                data: {
                    uid: [transactionUid, stageUid].join('/'),
                    data,
                },
            })
        ).data;
    }
}
