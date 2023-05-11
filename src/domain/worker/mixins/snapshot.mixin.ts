import _ from 'lodash';

import { ModuleConfigInterface } from '../../../interfaces/moduleConfig.interface';

export class SnapshotMixin {
    private buildSnapshot(moduleConfig: ModuleConfigInterface, mergeSnapshot: any = {}) {
        const snapshot: any = {
            ...this.mergeSnapshotModuleConfig(moduleConfig, mergeSnapshot),
            stagesConfig: this.mergeSnapshotStagesConfig(moduleConfig, mergeSnapshot),
            moduleExecution: {
                ..._.pick(this['moduleExecution'], 'id', 'date'),
            }
        };

        return snapshot;
    }

    private mergeSnapshotModuleConfig(moduleConfig, mergeSnapshot) {
        return _.defaultsDeep(
            _.omit(mergeSnapshot, 'stagesConfig'),
            _.omit(moduleConfig, 'stagesConfig')
        );
    }

    private mergeSnapshotStagesConfig(moduleConfig, mergeSnapshot) {
        const stagesConfigByUid = _.keyBy(moduleConfig.stagesConfig, 'stageUid');
        const mergeStageConfigByUid = _.keyBy(mergeSnapshot.stagesConfig || [], 'stageUid');
        return _.toArray(_.defaultsDeep(mergeStageConfigByUid, stagesConfigByUid));
    }
}
