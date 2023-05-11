
import { ApiProvider } from 'node_common/dist/providers/api.provider';
import { StageStatusEnum } from '../types/stageStatus.type';

export class StageExecutionProvider extends ApiProvider {
    static baseUrl = process.env.M0_API;
    static basePath = 'm0/stageExecution';

    static async create(moduleExecutionId: number, stageConfigId: number, _data = {}, statusUid = StageStatusEnum.INITIAL) {
        const url = [this.basePath, '?find=1'].join('/');
        const data = {
            moduleExecutionId,
            stageConfigId,
            statusUid,
            data: _data
        };

        return (await this.fetch({
            method: 'post',
            url,
            data
        })).data;
    }

    static async update(data) {
        const url = [this.basePath].join('/');

        return (await this.fetch({
            method: 'put',
            url,
            data
        })).data;
    }

    static async updateStatus(id, statusUid) {
        return await this.update({ id, statusUid });
    }

    static async findByTransactionAndModuleAndIndex(
        transactionUid: string,
        stageUid: string,
        // relevant ony to parallel process
        index = -1
    ) {
        const url = [
            this.basePath,
            'findByTransactionAndModule',
            transactionUid,
            stageUid,
            index
        ].join('/');

        const result = (await this.fetch({ url })).data;
        return result;
    }
}
