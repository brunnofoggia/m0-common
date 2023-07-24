import { M0ApiProvider } from './m0Api.provider';

export class ScheduleStartProvider extends M0ApiProvider {
    static basePath = 'm0/scheduleStart';

    static async execute() {
        const url = [this.basePath, 'execute'].join('/');

        return await this.request({
            method: 'get',
            url,
        });
    }
}
