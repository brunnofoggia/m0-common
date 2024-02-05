import { WorkerError } from '../../../worker/error';
import { StageStructureProperties } from '../../../../interfaces/stageParts.interface';
import { StageStatusEnum } from '../../../../types/stageStatus.type';

export abstract class SecretsMixin {
    abstract _getSolutions();
    abstract getEnv();
    abstract getProjectUid();

    buildSecretPath(name: string, basePath: any = null) {
        const env = this.getEnv();
        const path = ['', env];
        basePath === null && (basePath = [this.getProjectUid()].join('/'));
        path.push(basePath);
        path.push(name);

        return path.join('/');
    }

    stripSlashesFromSecretName(secretName: string) {
        return secretName.replace(/^\//, '').replace(/\/$/, '');
    }

    shouldClearSecrets() {
        return this.body.options.clearSecrets || !!process.env.IS_TS_NODE;
    }

    async clearSecretsCache() {
        const { secrets } = await this._getSolutions();
        if (this.shouldClearSecrets()) secrets.clearCache();
    }

    async getSecret(name: string, basePath: any = null) {
        name = this.stripSlashesFromSecretName(name);
        const { secrets } = await this._getSolutions();

        await this.clearSecretsCache();

        const secretPath = this.buildSecretPath(name, basePath);
        const value = await secrets.getSecretValue(secretPath);
        if (!value) throw new WorkerError(`secret:value not found for ${secretPath}`, StageStatusEnum.FAILED);

        return value;
    }

    async getGlobalSecret(name: string, basePath: any = null) {
        basePath === null && (basePath = ['mx'].join('/'));
        return await this.getSecret(name, basePath);
    }

    async getModuleSecret(name: string, basePath: any = null) {
        basePath === null && (basePath = [this.getProjectUid(), this.moduleUid].join('/'));
        return await this.getSecret(name, basePath);
    }

    async getStageSecret(name: string, basePath: any = null) {
        basePath === null && (basePath = [this.getProjectUid(), this.stageUid].join('/'));
        return await this.getSecret(name, basePath);
    }
}

export interface SecretsMixin extends StageStructureProperties {}
