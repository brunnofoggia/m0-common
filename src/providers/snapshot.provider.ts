import { throwHttpException } from 'node-labs/lib/utils/errors';

import { ERROR } from '../types/error.type';
import { M0ApiProvider, M0ApiProviderV2 } from './m0Api.provider';

export class SnapshotProviderV2 extends M0ApiProviderV2 {
    basePath = 'm0/snapshot';

    buildFindUrl(projectUid: string, transactionUid: string, stageUid: string) {
        const url = [this.basePath];
        if (projectUid) url.push(projectUid);
        url.push(transactionUid);
        url.push(stageUid);
        return url.join('/');
    }

    async findModuleConfig(projectUid: string, transactionUid: string, stageUid: string, forceUpdate = 0) {
        // TODO: disabled but implemented. will work if/when projectUid become required into message body
        projectUid = '';

        if (!transactionUid) throwHttpException(ERROR.TRANSACTIONUID_EMPTY);
        const url = this.buildFindUrl(projectUid, transactionUid, stageUid) + '?forceUpdate=' + forceUpdate;
        const data = (
            await this.request({
                method: 'get',
                url,
            })
        ).data;

        return data;
    }

    async saveModuleConfig(projectUid: string, transactionUid: string, stageUid: string, data = {}) {
        // TODO: disabled but implemented. will work if/when projectUid become required into message body
        projectUid = '';

        const url = [this.basePath].join('/');

        return (
            await this.request({
                method: 'put',
                url,
                data: {
                    uid: [projectUid, transactionUid, stageUid].join('/'),
                    data,
                },
            })
        ).data;
    }
}

export class SnapshotProvider extends M0ApiProvider {
    static instance;

    static async setInstance() {
        if (!this.instance) {
            this.instance = new SnapshotProviderV2();
            await this.instance.initialize();
        }
        return this.instance;
    }

    static async findModuleConfig(projectUid: string, transactionUid: string, stageUid: string, forceUpdate = 0) {
        await this.setInstance();
        return this.instance.findModuleConfig(projectUid, transactionUid, stageUid, forceUpdate);
    }

    static async saveModuleConfig(projectUid: string, transactionUid: string, stageUid: string, data = {}) {
        await this.setInstance();
        return this.instance.saveModuleConfig(projectUid, transactionUid, stageUid, data);
    }
}
