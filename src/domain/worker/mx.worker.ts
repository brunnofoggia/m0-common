import { DynamicDatabase } from 'node-labs/lib/services/dynamicDatabase.service';

import { StageWorker } from './stage.worker';
import { isArray } from 'lodash';

export class MXWorker extends StageWorker {
    public async closeConnections() {
        return await DynamicDatabase.closeConnections(this.uniqueId);
    }

    public getProductName() {
        return this.moduleUid.split('_')[0];
    }

    getTimezone() {
        return +this.project._config?.timezone || 0;
    }

    // #region stages
    getParentStage() {
        return this.stageConfig.config.parentStage || this.stageExecution.data._calledByStage;
    }

    getPrevStage() {
        return this.stageConfig.config.prevStage || this.stageExecution.data._calledByStage;
    }

    getPrevStageList() {
        const prevStage_ = this.getPrevStage();
        return isArray(prevStage_) ? prevStage_ : [prevStage_];
    }

    getParentStageDir() {
        return [this.rootDir, this.getParentStage()].join('/');
    }
    // #endregion
}
