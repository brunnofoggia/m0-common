import _ from 'lodash';
import _debug from 'debug';
const debug = _debug('worker:handler:split');

import { splitFile } from '../../../utils/split';
import { StageWorker } from '../stage.worker';
import { WorkerError } from '../error';
import { StageStatusEnum } from '../../../types/stageStatus.type';

const prepareConfig = (_config, worker) => {
    const defaultOptions = {
        bulkLimit: 50000,
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
    const fromDir = [rootDir, config.input?.dir || config.prevStage].join('/');

    let splitLength = 0;
    let done = false;
    let error;
    try {
        debug('deleting directory');
        if (await storage.checkDirectoryExists(stageDir + '/')) {
            debug('directory found');
            await storage.deleteDirectory(stageDir + '/');
        }

        const files = await storage.readDirectory(fromDir);
        debug('split files', files);

        for (const filePath of files) {
            if (filePath.endsWith('/')) continue;
            splitLength += await splitItem({ filePath, stageDir, worker, config, storage, splitNumberStartAt: splitLength });
        }

        await stateService?.save(lengthKey, splitLength);
        done = true;
    } catch (_error) {
        error = _error;
    }

    const timeSpent = await monitorService?.timeEnd(monitorTimeKey);
    await monitorService?.memoryIntervalEnd(monitorMemKey);

    debug(`timer ${key}: `, timeSpent);

    if (!done) throw error;
};

const readStream = async (fromPath, storage) => {
    try {
        return await storage.readStream(fromPath);
    } catch (error) {
        debug(`file not found ${fromPath}`);
        throw error;
    }
};

const splitItem = async ({ filePath, stageDir, worker, config, storage, splitNumberStartAt }) => {
    let splitLength = 0;

    const createFileStream = async () => await readStream(filePath, storage);
    const fileStream = await createFileStream();
    if (!fileStream) throw new WorkerError('cant open the file', StageStatusEnum.FAILED);

    const limitRows = worker.isProjectConfigActivated('limitRows');

    debug('reading file', filePath);
    await splitFile(
        createFileStream,
        config,
        '',
        (content, lineNumber, lineCount, splitNumber, bulkLimit) => {
            const skip = limitRows && (lineCount >= worker['skipLimit'] || splitNumber >= worker['skipLimit']);
            // debug('skip test', lineCount, splitNumber);
            return content && lineNumber > 0 && !skip ? content : null;
        },
        async (splitNumber, content, parts) => {
            const filename = splitNumber + splitNumberStartAt;
            debug('sending file');
            const filePath = [stageDir, filename].join('/');
            const stream = await storage.sendStream(filePath);
            await stream.write(content);
            await stream.end();
            parts.finished++;
            debug(`sent file ${filePath}`);

            parts.ordered > splitLength && (splitLength = parts.ordered);
        },
    );

    return splitLength;
};

export { split };
