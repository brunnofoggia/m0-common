import { applyMixins } from 'node-labs/lib/utils/mixin';

import { Domain } from '../../../../types/domain.type';
import { StageAllProperties, StageParts, StageStructureProperties } from '../../../../interfaces/stageParts.interface';

import { DynamicWorkerMixin } from './dynamicWorker.mixin';

export abstract class InjectionMixin {
    abstract getStageParts(): StageParts;
    abstract get(): StageAllProperties;

    /* domains */
    async _loadDomains(domains, path, type: Domain) {
        const props = this.get();

        // legacy
        const parts = this.getStageParts();

        for (const name of domains) {
            const Domain = await this.loadWorkerClass(name, path);
            const instance = !Domain.getInstance ? new Domain(props, this) : await Domain.getInstance(parts, this);
            if (instance._set) instance._set(props, this);

            // legacy
            if (instance.setStageParts) instance.setStageParts(parts, this);

            this[type + 'Domain'][name] = instance;
        }
    }

    async loadModuleDomains(domains) {
        const path = this.buildWorkerModuleDomainsPath();
        await this._loadDomains(domains, path, Domain.module);
    }

    async loadStageDomains(domains) {
        const path = this.buildWorkerStageDomainsPath();
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

    buildWorkerModulePath() {
        return `modules/${this.moduleUid}`;
    }

    buildWorkerStagePath() {
        return `${this.buildWorkerModulePath()}/stages/${this.stageName}`;
    }

    buildWorkerModuleDomainsPath() {
        return `${this.buildWorkerModulePath()}/domain`;
    }

    buildWorkerStageDomainsPath() {
        return `${this.buildWorkerStagePath()}/domain`;
    }

    async loadWorkerClass(name, path = null) {
        !path && (path = this.buildWorkerStageDomainsPath());
        const worker = this.getWorker();
        return this._loadWorkerClass(name, path, worker);
    }
}

export interface InjectionMixin extends StageStructureProperties, DynamicWorkerMixin {}
