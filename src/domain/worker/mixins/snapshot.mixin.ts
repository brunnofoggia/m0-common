import { size, pick, defaultsDeep, omit, keyBy, toArray, find } from 'lodash';

import { ModuleConfigInterface } from '../../../interfaces/moduleConfig.interface';
import { SnapshotProvider } from '../../../providers/snapshot.provider';
import { ModuleConfigProvider } from '../../../providers/moduleConfig.provider';
import { StageStructureProperties } from '../../../interfaces/stageParts.interface';

export abstract class SnapshotMixin {
    buildSnapshot(moduleConfig: ModuleConfigInterface, mergeSnapshot: any = {}) {
        const snapshot: any = {
            ...this.mergeSnapshotModuleConfig(moduleConfig, mergeSnapshot),
            stagesConfig: this.mergeSnapshotStagesConfig(moduleConfig, mergeSnapshot),
            moduleExecution: {
                ...pick(this.moduleExecution, 'id', 'date'),
            },
        };

        return snapshot;
    }

    mergeSnapshotModuleConfig(moduleConfig, mergeSnapshot) {
        return defaultsDeep(omit(mergeSnapshot, 'stagesConfig'), omit(moduleConfig, 'stagesConfig'));
    }

    mergeSnapshotStagesConfig(moduleConfig, mergeSnapshot) {
        const stagesConfigByUid = keyBy(moduleConfig.stagesConfig, 'stageUid');
        const mergeStageConfigByUid = keyBy(mergeSnapshot.stagesConfig || [], 'stageUid');
        return toArray(defaultsDeep(mergeStageConfigByUid, stagesConfigByUid));
    }

    async findModuleConfig(transactionUid, moduleUid) {
        return await ModuleConfigProvider.findConfig(transactionUid, moduleUid);
    }

    async _findStageConfig(projectUid, transactionUid, stageUid) {
        const moduleConfig: ModuleConfigInterface = await SnapshotProvider.find(projectUid, transactionUid, stageUid);
        return moduleConfig.stageConfig;
    }

    async findStageConfig(stageUid) {
        return await this._findStageConfig(this.projectUid, this.transactionUid, stageUid);
    }

    getStageConfigFromModule(stageUid, moduleConfig) {
        const foundStageConfig = find(moduleConfig.stagesConfig || [], (stage) => stage.stageUid === stageUid);

        // allow to merge snapshot with stage config on worker
        const stageConfig = moduleConfig.stageConfig || {};
        return defaultsDeep(foundStageConfig || {}, stageConfig);
    }

    async _createSnapshot({ projectUid = '', transactionUid, stageUid, mergeSnapshot = {} }) {
        const moduleUid = stageUid.split('/')[0];
        const moduleConfig = await ModuleConfigProvider.findConfig(transactionUid, moduleUid);

        if (!moduleConfig) {
            throw new Error(`Module config not found (${moduleUid})`);
        }

        await SnapshotProvider.save(projectUid, transactionUid, moduleUid, this.buildSnapshot(moduleConfig, mergeSnapshot));
        return moduleConfig;
    }

    async getSnapshot({ projectUid = '', transactionUid, stageUid, forceUpdate = false, mergeSnapshot = {} }) {
        const forceUpdate_ = +forceUpdate;
        let moduleConfig;

        if (!forceUpdate_) moduleConfig = await SnapshotProvider.find(projectUid, transactionUid, stageUid, forceUpdate_);
        if (!size(moduleConfig) || forceUpdate_) {
            // create / update a snapshot
            moduleConfig = await this._createSnapshot({ projectUid, transactionUid, stageUid, mergeSnapshot });
        }

        const stageConfig = this.getStageConfigFromModule(stageUid, moduleConfig);
        return { moduleConfig, stageConfig };
    }

    async reloadSnapshot({ projectUid = '', transactionUid, stageUid, mergeSnapshot = {} }) {
        const moduleConfig = await this._createSnapshot({ projectUid, transactionUid, stageUid, mergeSnapshot });
        const stageConfig = this.getStageConfigFromModule(stageUid, moduleConfig);
        return { moduleConfig, stageConfig };
    }

    async createSnapshot({ projectUid = '', transactionUid, stageUid, forceUpdate = false, mergeSnapshot = {} }) {
        let { moduleConfig, stageConfig } = await this.getSnapshot({
            projectUid,
            transactionUid,
            stageUid,
            forceUpdate,
            mergeSnapshot,
        });

        // keep snapshot always up to date
        const keepSnapshotUpdated = !!stageConfig?.config?.keepSnapshotUpdated;
        // if a new stage is registered manually, config is reloaded
        const tryRecreateSnapshotOnce = !size(stageConfig);

        if (tryRecreateSnapshotOnce || keepSnapshotUpdated) {
            const snapshot = await this.reloadSnapshot({ projectUid, transactionUid, stageUid, mergeSnapshot });
            moduleConfig = snapshot.moduleConfig;
            stageConfig = snapshot.stageConfig;
        }

        if (!size(stageConfig)) throw new Error(`Stage config not found (${stageUid})`);
        return { moduleConfig, stageConfig };
    }
}

export interface SnapshotMixin extends StageStructureProperties {}
