import { applyMixins } from 'node-labs/lib/utils/mixin';

import { Domain } from '../../../../types/domain.type';
import { StageAllProperties, StageParts, StageStructureProperties } from '../../../../interfaces/stageParts.interface';
import { DomainOptions } from '../../../../interfaces/domain.interface';

import { DynamicWorkerMixin } from './dynamicWorker.mixin';
import { cloneDeep } from 'lodash';

const _result = function (method, ...args) {
    if (this[method]) return this[method](...args);
};

export abstract class InjectionMixin {
    abstract get(): StageAllProperties;
    abstract prepareOptions(options: any);
    abstract replaceStageExecutionSplitter(stageUid: string, executionUid?: string): string;

    /* domains */
    async _loadDomains(domains, path, type: Domain) {
        for (const name of domains) {
            const instance = await this._loadDomain(name, path);
            this[type + 'Domain'][name] = instance;
        }
    }

    async _instantiateDomain(Domain, { domainOptions }) {
        const instance = !Domain.getInstance ? new Domain(this, domainOptions) : await Domain.getInstance(this, domainOptions);
        instance._call = _result;

        return instance;
    }

    async _prepareDomain(domain, domainOptions, ignoreInitialized = false) {
        if (!domain['_initialized'] || ignoreInitialized) {
            domain._call = _result;

            // lifecycle
            await domain._call('initialize', this, domainOptions);

            domain['_initialized'] = true;
        }
    }

    async _loadDomain(name, path) {
        const domainPath = `${path}/${name}`;
        const domainOptions: DomainOptions = { name, path: domainPath, basePath: path };

        const Class_ = await this._loadDomainClass(name, path);
        const instance = await this._instantiateDomain(Class_, { domainOptions });
        if (!instance) throw new Error(`instance for "${name}" wasnt created sucessfully`);

        if (!instance['_initialized']) {
            await this._prepareDomain(instance, domainOptions);

            // TODO: remove legacy
            await instance._call('setStageParts', this, domainOptions);
        }

        const defaultOptions = cloneDeep(instance.getDefaultOptions ? instance.getDefaultOptions() : instance.defaultOptions || {});
        this.prepareOptions(defaultOptions);
        return instance;
    }

    async _loadDomainClass(name, path) {
        const domainPath = `${path}/${name}`;
        const domainOptions: DomainOptions = { name, path: domainPath, basePath: path };

        const Class_ = await this.loadWorkerClass(name, path);
        if (!Class_) throw new Error(`Domain "${name}" not found`);

        await this._prepareDomain(Class_, domainOptions, true);
        return Class_;
    }

    async loadModuleDomains(domains) {
        const path = this.buildWorkerModuleDomainsPath();
        await this._loadDomains(domains, path, Domain.module);
    }

    async loadStageDomains(domains) {
        const path = this.buildWorkerStageDomainsPath();
        await this._loadDomains(domains, path, Domain.stage);
    }

    async loadParentStageDomains(domains) {
        const path = this.buildWorkerParentStageDomainsPath();
        await this._loadDomains(domains, path, Domain.stage);
    }

    async loadPartStageDomains(domains) {
        const path = this.buildWorkerPartStageDomainsPath();
        await this._loadDomains(domains, path, Domain.stage);
    }

    /* mixins */
    async loadMixins(mixins, _class) {
        const path = this.buildWorkerStagePath();

        for (const name of mixins) {
            const Mixin = await this.loadWorkerClass(name, path);
            applyMixins(_class, [Mixin]);
        }
    }

    readSourceUid() {
        const sourceUidData = this.stageConfig.config.stageSourceUid.split('/');
        return { moduleUid: sourceUidData[0], stageName: sourceUidData[1] };
    }

    isFromAnotherSource() {
        return this.stageConfig.config.stageSourceUid && this.stageConfig.config.stageSourceUid !== this.stageUid;
    }

    buildWorkerModulePath() {
        const moduleUid = !this.isFromAnotherSource() ? this.moduleUid : this.readSourceUid().moduleUid;
        return `modules/${moduleUid}`;
    }

    domainDirName(): string {
        return 'domain';
    }

    buildWorkerStagePath() {
        const stageName = !this.isFromAnotherSource() ? this.stageName : this.readSourceUid().stageName;
        return `${this.buildWorkerModulePath()}/stages/${stageName}`;
    }

    buildWorkerParentStagePath() {
        const [, stageName] = this.replaceStageExecutionSplitter(this['getParentStage']()).split('/');
        return `${this.buildWorkerModulePath()}/stages/${stageName}`;
    }

    buildWorkerPartStagePath() {
        const childStage = this['getChildStage']();
        const [, stageName] = childStage.split('/');
        return `${this.buildWorkerModulePath()}/stages/${stageName}`;
    }

    buildWorkerModuleDomainsPath() {
        return `${this.buildWorkerModulePath()}/${this.domainDirName()}`;
    }

    buildWorkerModuleDomainsFactoryPath(factoryDirName) {
        return `${this.buildWorkerModuleDomainsPath()}/${factoryDirName}`;
    }

    buildWorkerStageDomainsPath() {
        return `${this.buildWorkerStagePath()}/${this.domainDirName()}`;
    }

    buildWorkerParentStageDomainsPath() {
        return `${this.buildWorkerParentStagePath()}/${this.domainDirName()}`;
    }

    buildWorkerPartStageDomainsPath() {
        return `${this.buildWorkerPartStagePath()}/${this.domainDirName()}`;
    }

    async loadWorkerClass(name, path = null) {
        !path && (path = this.buildWorkerStageDomainsPath());
        const worker = this.getWorker();
        return this._loadWorkerClass(name, path, worker);
    }
}

export interface InjectionMixin extends StageStructureProperties, DynamicWorkerMixin {}
