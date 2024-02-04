import { StageStructureProperties } from '../../../../interfaces/stageParts.interface';
import { importMixin } from '../../../../utils/importWorker';

export abstract class DynamicWorkerMixin {
    abstract getWorker(): string;
    abstract getDefaultWorker(): string;

    async _loadWorkerClass(name, path, worker) {
        const defaultWorker = this.getDefaultWorker();
        // worker may be the name of some client located at stageConfig.config.worker
        try {
            return await importMixin(path, name, worker);
        } catch (err) {
            if (worker != defaultWorker) {
                // if worker is the name of a client, but file is not found
                // get default instead
                return this._loadWorkerClass(name, path, defaultWorker);
            }
            throw new Error(`class "${name}" not found`);
        }
    }
}

export interface DynamicWorkerMixin extends StageStructureProperties {}
