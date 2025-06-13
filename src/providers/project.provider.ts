import { M0ApiProvider, M0ApiProviderV2 } from './m0Api.provider';

export class ProjectProviderV2 extends M0ApiProviderV2 {
    basePath = 'm0/project';

    async findConfig(projectUid: string) {
        const url = [this.basePath, 'findConfig', projectUid].join('/');
        const data = (await this.request({ url })).data;

        return data;
    }
}

export class ProjectProvider extends M0ApiProvider {
    static instance;

    static async setInstance() {
        if (!this.instance) {
            this.instance = new ProjectProviderV2();
            await this.instance.initialize();
        }
        return this.instance;
    }

    static async findConfig(projectUid: string) {
        await this.setInstance();
        return this.instance.findConfig(projectUid);
    }
}
