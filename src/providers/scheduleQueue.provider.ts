import { ApiProvider } from 'node_common/dist/providers/api.provider';

export class ScheduleQueueProvider extends ApiProvider {
    static baseUrl = process.env.M0_API;
    static basePath = 'm0/scheduleQueue';

    static async save(data = {}) {
        const url = [this.basePath].join('/');

        return (await this.fetch({
            method: 'post',
            url,
            data
        })).data;
    }
}
