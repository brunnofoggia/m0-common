import { StageStatusEnum } from '../types/stageStatus.type';
import { M0ApiProvider, M0ApiProviderV2 } from './m0Api.provider';

export class StageExecutionProviderV2 extends M0ApiProviderV2 {
    basePath = 'm0/stageExecution';

    async create(moduleExecutionId: number, stageConfigId: number, system: any = {}, _data: any = {}, statusUid = StageStatusEnum.INITIAL) {
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

    async update(data) {
        const url = [this.basePath].join('/');

        return (
            await this.request({
                method: 'put',
                url,
                data,
            })
        ).data;
    }

    async updateStatus(id, statusUid) {
        return await this.update({ id, statusUid });
    }

    async findByTransactionAndModuleAndIndex(
        transactionUid: string,
        stageUid: string,
        executionUid = '',
        // relevant ony to parallel process
        index: any = -1,
    ) {
        const url = [this.basePath, 'findByTransactionAndModule', transactionUid, stageUid, index, executionUid].join('/');
        const result = (await this.request({ url })).data;
        return result;
    }

    async findAllByTransactionAndModule(transactionUid: string, stageUid: string, executionUid = '', index: any = -1) {
        const url = [this.basePath, 'findAllByTransactionAndModule', transactionUid, stageUid, index, executionUid].join('/');

        const result = (await this.request({ url })).data;
        return result;
    }
}

export class StageExecutionProvider extends M0ApiProvider {
    static instance;

    static async setInstance() {
        if (!this.instance) {
            this.instance = new StageExecutionProviderV2();
            await this.instance.initialize();
        }
        return this.instance;
    }

    static async create(
        moduleExecutionId: number,
        stageConfigId: number,
        system: any = {},
        _data: any = {},
        statusUid = StageStatusEnum.INITIAL,
    ) {
        await this.setInstance();
        return this.instance.create(moduleExecutionId, stageConfigId, system, _data, statusUid);
    }

    static async update(data) {
        await this.setInstance();
        return this.instance.update(data);
    }

    static async updateStatus(id, statusUid) {
        await this.setInstance();
        return this.instance.update({ id, statusUid });
    }

    static async findByTransactionAndModuleAndIndex(
        transactionUid: string,
        stageUid: string,
        executionUid = '',
        // relevant ony to parallel process
        index: any = -1,
    ) {
        await this.setInstance();
        return this.instance.findByTransactionAndModuleAndIndex(transactionUid, stageUid, executionUid, index);
    }

    static async findAllByTransactionAndModule(transactionUid: string, stageUid: string, executionUid = '', index: any = -1) {
        await this.setInstance();
        return this.instance.findAllByTransactionAndModule(transactionUid, stageUid, executionUid, index);
    }
}
