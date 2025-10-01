import { WorkerError } from '../../../worker/error';
import { StageStructureProperties } from '../../../../interfaces/stageParts.interface';
import { StageStatusEnum } from '../../../../types/stageStatus.type';
import { PathMixin } from './path.mixin';
import { MODULE } from '../../../../types/module.type';

export abstract class SecretsMixin {
    abstract _getSolutions();
    abstract getEnv(): string;
    abstract getFakeEnv(): string;
    abstract getProjectUid(): string;

    getSecretsEnv() {
        return process.env.SECRETS_ENV || this.getFakeEnv();
    }

    buildSecretPath(name: string, basePath: any = null) {
        const env = this.getSecretsEnv();
        const path = ['', env];
        basePath === null && (basePath = this.getProjectPath());
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

    getM0SecretPath(name: string) {
        const basePath = [MODULE.M0].join('/');
        return this.buildSecretPath(name, basePath);
    }

    async getM0Secret(name: string) {
        const basePath = [MODULE.M0].join('/');
        return await this.getSecret(name, basePath);
    }

    async getGlobalSecret(name: string, basePath: any = null) {
        basePath === null && (basePath = [MODULE.MX].join('/'));
        return await this.getSecret(name, basePath);
    }

    async getProjectSecret(name: string, basePath: any = null) {
        basePath === null && (basePath = this.getProjectPath());
        return await this.getSecret(name, basePath);
    }

    async getModuleSecret(name: string, basePath: any = null) {
        basePath === null && (basePath = this.getProjectModulePath());
        return await this.getSecret(name, basePath);
    }

    async getStageSecret(name: string, basePath: any = null) {
        basePath === null && (basePath = this.getProjectStagePath());
        return await this.getSecret(name, basePath);
    }
}

export interface SecretsMixin extends StageStructureProperties, PathMixin {}
