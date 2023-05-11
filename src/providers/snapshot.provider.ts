import { throwHttpException } from 'node_common/dist/utils/errors';
import { ApiProvider } from 'node_common/dist/providers/api.provider';
import { ERROR } from '../types/error.type';

export class SnapshotProvider extends ApiProvider {
    static baseUrl = process.env.M0_API;
    static basePath = 'm0/snapshot';

    static async find(transactionUid: string, stageUid: string) {
        if (!transactionUid) throwHttpException(ERROR.TRANSACTIONUID_EMPTY);
        const url = [this.basePath, transactionUid, stageUid].join('/');
        const data = (await this.fetch({
            method: 'get',
            url
        })).data;

        return data;
    }

    static async save(transactionUid: string, stageUid: string, data = {}) {
        const url = [this.basePath].join('/');

        return (await this.fetch({
            method: 'put',
            url,
            data: {
                uid: [transactionUid, stageUid].join('/'),
                data,
            }
        })).data;
    }
}
