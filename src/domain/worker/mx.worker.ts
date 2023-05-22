import { DynamicDatabase } from 'node_common/dist/services/dynamicDatabase.service';

import { StageWorker } from './stage.worker';

export class MXWorker extends StageWorker {

    public async closeConnections() {
        return await DynamicDatabase.closeConnections(this.uniqueId);
    }

    getTimezone() {
        return +this.project._config?.timezone || 0;
    }
}
