import { StageStatusEnum } from '../types/stageStatus.type';
import { M0ApiProvider } from './m0Api.provider';

export class StageExecutionProvider extends M0ApiProvider {
    static basePath = 'm0/stageExecution';

    static async create(
        moduleExecutionId: number,
        stageConfigId: number,
        system: any = {},
        _data: any = {},
        statusUid = StageStatusEnum.INITIAL,
    ) {
        const url = [this.basePath, '?find=1'].join('/');
        const data = {
            moduleExecutionId,
            stageConfigId,
            statusUid,
            data: _data,
            system,
        };

        return (
            await this.request({
                method: 'post',
                url,
                data,
            })
        ).data;
    }

    static async update(data) {
        const url = [this.basePath].join('/');

        return (
            await this.request({
                method: 'put',
                url,
                data,
            })
        ).data;
    }

    static async updateStatus(id, statusUid) {
        return await this.update({ id, statusUid });
    }

    static async findByTransactionAndModuleAndIndex(
        transactionUid: string,
        stageUid: string,
        executionUid = '',
        // relevant ony to parallel process
        index = -1,
    ) {
        const url = [this.basePath, 'findByTransactionAndModule', transactionUid, stageUid, index, executionUid].join('/');

        const result = (await this.request({ url })).data;
        return result;
    }

    static async findAllByTransactionAndModule(transactionUid: string, stageUid: string, executionUid = '', index = -1) {
        const url = [this.basePath, 'findAllByTransactionAndModule', transactionUid, stageUid, index, executionUid].join('/');

        const result = (await this.request({ url })).data;
        return result;
    }
}
