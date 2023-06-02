import _ from 'lodash';
import _debug from 'debug';
const debug = _debug('worker:handler:split');

import { splitFile } from '../../../utils/split';
import { StageWorker } from '../stage.worker';

const prepareConfig = (_config, worker) => {
    const defaultOptions = {
        bulkLimit: 50000
    };

    const source: any = {};
    if (worker.isProjectConfigActivated('limitRows')) {
        source._forceBulkLimit = worker['skipLimit'];
    }

    return _.defaultsDeep(source, _config, defaultOptions);
};

const split = async (worker: StageWorker, stateService = null, monitorService = null) => {
    const { stageConfig, rootDir, stageDir } = worker.get();

    const { storage } = await StageWorker.getSolutions();
    const key = stageConfig.stageUid;
    const monitorTimeKey = [stageDir, 'time'].join('/');
    const monitorMemKey = [stageDir, 'memory'].join('/');
    const lengthKey = [stageDir, 'length'].join('/');
    monitorService?.time(monitorTimeKey);
    monitorService?.memoryInterval();

    const config = prepareConfig(stageConfig.config, worker);
    const fromDir = [rootDir, config.input.dir].join('/');
    const fromPath = [fromDir, 'file'].join('/');

    let done = false;
    let error;
    try {
        debug('split file', fromPath);
        const createFileStream = async () => await readStream(fromPath, storage);
        const fileStream = await createFileStream();
        if (!fileStream) return;

        debug('deleting directory');
        if (await storage.checkDirectoryExists(stageDir + '/')) {
            debug('directory found');
            await storage.deleteDirectory(stageDir + '/');
        }
        const limitRows = worker.isProjectConfigActivated('limitRows');

        let splitLength = 0;
        debug('reading file');
        await splitFile(createFileStream, config, '',
            (content, lineNumber, lineCount, splitNumber, bulkLimit) => {
                const skip = limitRows &&
                    (lineCount >= worker['skipLimit'] || splitNumber >= worker['skipLimit']);
                // debug('skip test', lineCount, splitNumber);
                return lineNumber > 0 && !skip ? content : null;
            },
            async (splitNumber, content, parts) => {
                debug('sending file');
                await storage.sendContent([stageDir, splitNumber].join('/'), content);
                parts.finished++;
                debug(`sent file ${[stageDir, splitNumber].join('/')}`);

                parts.ordered > splitLength && (splitLength = parts.ordered);
            }
        );

        await stateService?.save(lengthKey, splitLength);
        done = true;
    } catch (_error) {
        error = _error;
    }

    const timeSpent = await monitorService?.timeEnd(monitorTimeKey);
    await monitorService?.memoryIntervalEnd(monitorMemKey);

    debug(`timer ${key}: `, timeSpent);

    if (!done)
        throw error;
};

const readStream = async (fromPath, storage) => {
    try {
        return await storage.readStream(fromPath);
    } catch (error) {
        debug(`file not found ${fromPath}`);
        throw error;
    }
};

export { split };
