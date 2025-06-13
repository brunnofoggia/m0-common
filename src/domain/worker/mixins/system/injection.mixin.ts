import { applyMixins } from 'node-labs/lib/utils/mixin';

import { Domain } from '../../../../types/domain.type';
import { StageAllProperties, StageStructureProperties } from '../../../../interfaces/stageParts.interface';
import { DomainOptions } from '../../../../interfaces/domain.interface';

import { DynamicWorkerMixin } from './dynamicWorker.mixin';
import { cloneDeep } from 'lodash';

// used to call methods from the domain instance (kinda copy of lodash.result)
const _result = function (method, ...args) {
    if (this[method]) return this[method](...args);
};

export abstract class InjectionMixin {
    // abstract get(): StageAllProperties;
    abstract prepareOptions(options?: any): any;
    abstract replaceStageExecutionSplitter(stageUid: string, executionUid?: string): string;

    readSourceUid() {
        const sourceUidData = this.stageConfig.config.stageSourceUid.split('/');
        return { moduleUid: sourceUidData[0], stageName: sourceUidData[1] };
    }

    isFromAnotherSource() {
        return this.stageConfig.config.stageSourceUid && this.stageConfig.config.stageSourceUid !== this.stageUid;
    }

    // #region domain loaders
    async _loadDomains(domains, path, type: Domain) {
        for (const name of domains) {
            const instance = await this._loadDomain(name, path);
            this[type + 'Domain'][name] = instance;
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

        const { Class_: DomainClass } = await this.loadWorkerClass(name, path);
        if (!DomainClass) throw new Error(`Domain "${name}" not found from path "${path}"`);

        await this._prepareDomain(DomainClass, domainOptions, true);
        return DomainClass;
    }

    async loadGlobalDomains(domains) {
        const path = this.buildWorkerGlobalDomainsPath();
        await this._loadDomains(domains, path, Domain.global);
    }

    async loadModuleDomains(domains, moduleUid = '') {
        const path = this.buildWorkerModuleDomainsPath(moduleUid);
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
    // #endregion

    // #region domain lifecycle
    async _instantiateDomain(Domain, { domainOptions }) {
        const instance = !Domain.getInstance ? new Domain(this, domainOptions) : await Domain.getInstance(this, domainOptions);
        instance._call = _result;

        return instance;
    }

    async _prepareDomain(domain, domainOptions, ignoreInitialized = false) {
        if (!domain['_initialized'] || ignoreInitialized) {
            domain._call = _result;

            // lifecycle
            await domain._call('onInitialize', this, domainOptions);
            // TODO: legacy. remove later
            await domain._call('initialize', this, domainOptions);

            domain['_initialized'] = true;
        }
    }

    async _destroyDomain(domain) {
        if (!domain['_destroyed']) {
            domain._call = _result;

            // lifecycle
            await domain._call('onDestroy');

            domain['_destroyed'] = true;
        }
    }
    // #endregion

    // #region paths
    buildWorkerModulePath(customModuleUid = '') {
        const moduleUid = customModuleUid ? customModuleUid : !this.isFromAnotherSource() ? this.moduleUid : this.readSourceUid().moduleUid;
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

    buildWorkerGlobalDomainsPath() {
        return `${this.domainDirName()}`;
    }

    buildWorkerModuleDomainsPath(customModuleUid = '') {
        return `${this.buildWorkerModulePath(customModuleUid)}/${this.domainDirName()}`;
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
    // #endregion

    // #region core loaders
    async loadMixins(mixins, BaseClass) {
        const path = this.buildWorkerStagePath();

        for (const name of mixins) {
            const { Class_: MixinClass } = await this.loadWorkerClass(name, path);
            if (!MixinClass) throw new Error(`Mixin "${name}" could not be loaded from path "${path}"`);

            applyMixins(BaseClass, [MixinClass]);
        }
    }
    async loadWorkerClass(name, path = null) {
        !path && (path = this.buildWorkerStageDomainsPath());
        const worker = this.getWorkerFile();

        let Class_;
        try {
            Class_ = await this._loadWorkerClass(name, path, worker);
        } catch (err) {
            console.error(`Error loading worker class "${name}" from path "${path}": ${err.message}`);
        }

        return { Class_ };
    }
    // #endregion
}

export interface InjectionMixin extends StageStructureProperties, DynamicWorkerMixin {}
