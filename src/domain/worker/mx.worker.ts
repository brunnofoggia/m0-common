import { DynamicDatabase } from 'node-common/dist/services/dynamicDatabase.service';

import { StageWorker } from './stage.worker';

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

    getParentStage() {
        return this.stageConfig.config.parentStage || this.stageExecution.data._calledByStage;
    }

    getParentStageDir() {
        return [this.rootDir, this.getParentStage()].join('/');
    }
}
