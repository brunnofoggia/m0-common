import { WorkerError } from '../../../worker/error';
import { StageStructureProperties } from '../../../../interfaces/stageParts.interface';
import { StageStatusEnum } from '../../../../types/stageStatus.type';
import { PathMixin } from './path.mixin';
import { MODULE } from '../../../../types/module.type';

export abstract class SecretsMixin {
    // #region abstract
    abstract _getSolutions();
    abstract getEnv(): string;
    abstract getFakeEnv(): string;
    abstract getProjectUid(): string;
    // #endregion

    // #region getters, setters
    getSecretsEnv() {
        return process.env.SECRETS_ENV || this.getFakeEnv();
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
    // #endregion

    // #region path builders
    buildSecretPath(name: string, basePath: any = null) {
        const env = this.getSecretsEnv();
        // starts with /dev /prd etc
        const path = ['', env];

        basePath === null && (basePath = this.getProjectPath());
        path.push(basePath);

        name = this.stripSlashesFromSecretName(name);
        path.push(name);

        return path.join('/');
    }

    buildM0SecretPath(name: string) {
        const basePath = this.getM0Path();
        return this.buildSecretPath(name, basePath);
    }

    buildGlobalSecretPath(name: string) {
        const basePath = this.getGlobalPath();
        return this.buildSecretPath(name, basePath);
    }

    buildProjectSecretPath(name: string) {
        const basePath = this.getProjectPath();
        return this.buildSecretPath(name, basePath);
    }

    buildModuleSecretPath(name: string) {
        const basePath = this.getProjectModulePath();
        return this.buildSecretPath(name, basePath);
    }

    buildStageSecretPath(name: string) {
        const basePath = this.getProjectStagePath();
        return this.buildSecretPath(name, basePath);
    }
    // #endregion

    // #region secret getters
    async getSecretValueByPath(secretPath: string) {
        await this.clearSecretsCache();
        const { secrets } = await this._getSolutions();

        const value = await secrets.getSecretValue(secretPath);
        if (!value) throw new WorkerError(`secret:value not found for ${secretPath}`, StageStatusEnum.FAILED);

        return value;
    }

    async getSecret(name: string, basePath: any = null) {
        const secretPath = this.buildSecretPath(name, basePath);
        return await this.getSecretValueByPath(secretPath);
    }

    async getM0Secret(name: string) {
        const m0SecretPath = this.buildM0SecretPath(name);
        return await this.getSecretValueByPath(m0SecretPath);
    }

    async getGlobalSecret(name: string) {
        const secretPath = this.buildGlobalSecretPath(name);
        return await this.getSecretValueByPath(secretPath);
    }

    async getProjectSecret(name: string) {
        const secretPath = this.buildProjectSecretPath(name);
        return await this.getSecretValueByPath(secretPath);
    }

    async getModuleSecret(name: string) {
        const secretPath = this.buildModuleSecretPath(name);
        return await this.getSecretValueByPath(secretPath);
    }

    async getStageSecret(name: string) {
        const secretPath = this.buildStageSecretPath(name);
        return await this.getSecretValueByPath(secretPath);
    }
    // #endregion
}

export interface SecretsMixin extends StageStructureProperties, PathMixin {}
