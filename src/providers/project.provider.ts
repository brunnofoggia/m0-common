import { M0ApiProvider } from './m0Api.provider';

export class ProjectProvider extends M0ApiProvider {
    static basePath = 'm0/project';

    static async findConfig(projectUid: string) {
        const url = [this.basePath, 'findConfig', projectUid].join('/');
        const data = (await this.request({ url })).data;

        return data;
    }
}
