import { M0ApiProvider, M0ApiProviderV2 } from './m0Api.provider';

export class WorkflowProvider extends M0ApiProviderV2 {
    basePath = 'm0/workflow';

    async trigger(data = {}) {
        const url = [this.basePath].join('/');

        return (
            await this.request({
                method: 'post',
                url,
                data,
            })
        ).data;
    }
}
