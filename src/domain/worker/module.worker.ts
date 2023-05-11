import _ from 'lodash';
// import { ERROR_LIST, throwHttpException } from '@common/errors.function';

export class ModuleWorker {
    static getConfig(stageUid, moduleConfig) {
        const stageConfig = moduleConfig.stageConfig || {};
        const foundStageConfig = _.find(moduleConfig.stagesConfig || [], stage => stage.stageUid === stageUid);

        // allow to merge snapshot with stage config on worker
        return _.defaultsDeep(foundStageConfig || {}, stageConfig);
    }
}