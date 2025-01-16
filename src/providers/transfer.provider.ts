import { StageStatusEnum } from '../types/stageStatus.type';
import { M0ApiProvider } from './m0Api.provider';
import { isPlainObject } from 'lodash';

export class TransferProvider extends M0ApiProvider {
    static basePath = 'm0/transfer';

    static async create(uid: string, text: any = {}) {
        const url = [this.basePath].join('/');
        const data = { uid, text: isPlainObject(text) ? JSON.stringify(text) : text };

        return (
            await this.request({
                method: 'post',
                url,
                data,
            })
        ).data;
    }

    static async delete(uid) {
        const url = [this.basePath, uid].join('/');

        return (
            await this.request({
                method: 'delete',
                url,
            })
        ).data;
    }

    static async findAllByPrefix(prefix: string) {
        const url = [this.basePath, 'findAllByPrefix', prefix].join('/');

        const result = (await this.request({ url })).data;
        return result;
    }

    static async removeAllByPrefix(prefix: string) {
        const url = [this.basePath, 'removeAllByPrefix', prefix].join('/');

        const result = (await this.request({ method: 'delete', url })).data;
        return result;
    }
}
