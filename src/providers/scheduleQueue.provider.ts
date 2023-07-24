import { M0ApiProvider } from './m0Api.provider';

export class ScheduleQueueProvider extends M0ApiProvider {
    static basePath = 'm0/scheduleQueue';

    static async execute() {
        const url = [this.basePath, 'execute'].join('/');

        return await this.request({
            method: 'get',
            url,
        });
    }

    static async save(data = {}) {
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
