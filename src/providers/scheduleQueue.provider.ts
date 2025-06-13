import { M0ApiProvider, M0ApiProviderV2 } from './m0Api.provider';

export class ScheduleQueueProviderV2 extends M0ApiProviderV2 {
    basePath = 'm0/scheduleQueue';

    async execute() {
        const url = [this.basePath, 'execute'].join('/');

        return await this.request({
            method: 'get',
            url,
        });
    }

    async save(data = {}) {
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

export class ScheduleQueueProvider extends M0ApiProvider {
    static instance;

    static async setInstance() {
        if (!this.instance) {
            this.instance = new ScheduleQueueProviderV2();
            await this.instance.initialize();
        }
        return this.instance;
    }

    static async execute() {
        await this.setInstance();
        return this.instance.execute();
    }

    static async save(data = {}) {
        await this.setInstance();
        return this.instance.save(data);
    }
}
