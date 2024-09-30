import { DynamicDatabase } from 'node-labs/lib/services/dynamicDatabase.service';

import { StageWorker } from './stage.worker';
import { ResultInterface } from 'interfaces/result.interface';

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
}
