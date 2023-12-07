import { size, pick, defaultsDeep, omit, keyBy, toArray, find } from 'lodash';

import { ModuleConfigInterface } from '../../../interfaces/moduleConfig.interface';
import { SnapshotProvider } from '../../../providers/snapshot.provider';
import { ModuleConfigProvider } from '../../../providers/moduleConfig.provider';

export class SnapshotMixin {
    buildSnapshot(moduleConfig: ModuleConfigInterface, mergeSnapshot: any = {}) {
        const snapshot: any = {
            ...this.mergeSnapshotModuleConfig(moduleConfig, mergeSnapshot),
            stagesConfig: this.mergeSnapshotStagesConfig(moduleConfig, mergeSnapshot),
            moduleExecution: {
                ...pick(this['moduleExecution'], 'id', 'date'),
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

    getStageConfigFromModule(stageUid, moduleConfig) {
        const stageConfig = moduleConfig.stageConfig || {};
        const foundStageConfig = find(moduleConfig.stagesConfig || [], (stage) => stage.stageUid === stageUid);

        // allow to merge snapshot with stage config on worker
        return defaultsDeep(foundStageConfig || {}, stageConfig);
    }

    async createSnapshot({ transactionUid, stageUid, forceUpdate = false, mergeSnapshot = {} }) {
        const moduleUid = stageUid.split('/')[0];
        let moduleConfig = await SnapshotProvider.find(transactionUid, stageUid, +forceUpdate);
        if (!moduleConfig || !size(moduleConfig) || forceUpdate) {
            // create / update a snapshot
            moduleConfig = await ModuleConfigProvider.findConfig(transactionUid, moduleUid);
            await SnapshotProvider.save(transactionUid, moduleUid, this['buildSnapshot'](moduleConfig, mergeSnapshot));
        }
        // get stageConfig for current stage
        const stageConfig = this.getStageConfigFromModule(stageUid, moduleConfig);

        // if a new stage is registered manually, config is reloaded
        if (!stageConfig || !size(stageConfig)) {
            // does not force twice
            if (!forceUpdate) {
                return this.createSnapshot({ transactionUid, stageUid, forceUpdate: true, mergeSnapshot });
            }
        } else {
            return { moduleConfig, stageConfig };
        }
    }
}
