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

const split = async (worker: StageWorker, stateService = null, monitorService = null, fromDir = '', toDir = '') => {
    const { stageConfig, rootDir, executionDir } = worker.get();
    if (!toDir) toDir = executionDir;

    const { storage } = await worker._getSolutions();
    const key = stageConfig.stageUid;
    const monitorTimeKey = [toDir, 'time'].join('/');
    const monitorMemKey = [toDir, 'memory'].join('/');
    const lengthKey = [toDir, 'length'].join('/');
    monitorService?.time(monitorTimeKey);
    monitorService?.memoryInterval();

    const options = prepareConfig(stageConfig.options, worker);
    const config = stageConfig.config;
    if (!fromDir) fromDir = [rootDir, options.input?.dir || config.prevStage].join('/');

    let splitLength = 0;
    let done = false;
    let error;
    try {
        debug('deleting directory');
        if (await storage.checkDirectoryExists(toDir + '/')) {
            debug('directory found');
            await storage.deleteDirectory(toDir + '/');
        }

        const files = await storage.readDirectory(fromDir);
        debug('split files', files);

        for (const filePath of files) {
            if (filePath.endsWith('/')) continue;
            splitLength += await splitItem({ filePath, toDir, worker, options, storage, splitNumberStartAt: splitLength });
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

const splitItem = async ({ filePath, toDir, worker, options, storage, splitNumberStartAt }) => {
    let splitLength = 0;

    const createFileStream = async () => await readStream(filePath, storage);
    const fileStream = await createFileStream();
    if (!fileStream) throw new WorkerError('cant open the file', StageStatusEnum.FAILED);

    const limitRows = worker.isProjectConfigActivated('limitRows');

    // writestream
    let writeStream;
    let writeStreamPath;
    // let writeStreamIndex;
    const createWriteStream = async (splitNumber) => {
        // writeStreamIndex = splitNumber;
        const filename = splitNumber + splitNumberStartAt;
        writeStreamPath = [toDir, filename].join('/');
        debug('sending file:', writeStreamPath);
        writeStream = await storage.sendStream(writeStreamPath);
    };

    debug('reading file', filePath);
    await splitFile(
        createFileStream,
        options,
        '',
        async (content, lineNumber, lineCount, splitNumber, bulkLimit) => {
            const skip = limitRows && (lineCount >= worker['skipLimit'] || splitNumber >= worker['skipLimit']);
            if (content && lineNumber > 0 && !skip) {
                // create next stream when number changes
                if (!writeStream) {
                    await createWriteStream(splitNumber);
                }

                await writeStream.writeLine(content);
                return false; // empty but increase line inserted count
            }

            // debug('skip test', lineCount, splitNumber);
            return null; // line skipped
        },
        async (splitNumber, content, parts) => {
            // end stream
            await writeStream.end();
            writeStream = null;
            parts.finished++;
            debug(`sent file ${writeStreamPath}`);

            // get total of files to return
            parts.ordered > splitLength && (splitLength = parts.ordered);
        },
        true,
    );

    return splitLength;
};

export { split };
