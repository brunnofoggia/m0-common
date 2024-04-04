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
    getPrevStage() {
        return this.stageConfig.config.prevStage || this.stageExecution.data.options._calledByStage;
    }

    getPrevStageList() {
        const prevStage_ = this.getPrevStage();
        return isArray(prevStage_) ? prevStage_ : [prevStage_];
    }

    getParentStage() {
        return (
            this.stageConfig.config.callbackStage || this.stageConfig.config.parentStage || this.stageExecution.data.options._calledByStage
        );
    }

    getParentStageDir() {
        const stageUid = this.replaceStageExecutionSplitter(this.getParentStage());
        return [this.rootDir, stageUid].join('/');
    }

    getChildStageUid() {
        return this.stageConfig.config.childStage || this.stageConfig.config.splitStage;
    }
    // #endregion
}
