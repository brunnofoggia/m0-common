import _ from 'lodash';
import _debug from 'debug';
const debug = _debug('worker:handler:split');
const essentialLog = _debug('worker:essential:handler:split');

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
    worker.increaseExecutionInfoValue('splitFileLength', 0);

    const { stageConfig, rootDir, executionDir, executionUid } = worker.get();
    if (!toDir) toDir = executionDir;

    const { storage } = await worker._getSolutions();
    const key = stageConfig.stageUid;
    const monitorTimeKey = [toDir, 'time'].join('/');
    const monitorMemKey = [toDir, 'memory'].join('/');
    const lengthKey = [toDir, 'length'].join('/');
    monitorService?.time(monitorTimeKey);
    monitorService?.memoryInterval();

    const options = prepareConfig(stageConfig.options, worker);
    if (!fromDir) fromDir = [rootDir, options.input?.dir || worker.getPrevStage()].join('/');
    const fromPath_ = [fromDir];
    if (executionUid && !options._ignoreExecutionUidForStorage) {
        fromPath_.push(executionUid);
    }

    const fromPath = fromPath_.join('/');
    let splitLength = 0;
    let done = false;
    let error;
    const headers = [];
    try {
        debug('deleting directory');
        if (await storage.checkDirectoryExists(toDir + '/')) {
            debug('directory found');
            await storage.deleteDirectory(toDir + '/');
        }

        essentialLog('reading directory', fromPath);
        const files = await storage.readDirectory(fromPath);
        essentialLog('split files', files);

        for (const filePath of files) {
            if (filePath.endsWith('/')) continue;
            essentialLog('splitting file', filePath);
            const result = await splitItem({ filePath, toDir, worker, options, storage, splitNumberStartAt: splitLength });
            splitLength += result.splitLength;
            if (result.header) headers.push(result.header);
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
    return { splitLength, headers };
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
    let header = null;

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
            const skipLimitReached = limitRows && (lineCount >= worker['skipLimit'] || splitNumber >= worker['skipLimit']);

            const hasHeader = !options.noHeader;
            const isHeader = hasHeader && lineNumber === 0;
            const isNotHeader = !hasHeader || lineNumber > 0;

            if (isHeader) {
                header = content;
            } else if (content && !skipLimitReached) {
                // create next stream when number changes
                if (!writeStream) {
                    await createWriteStream(splitNumber);
                }

                await writeStream.writeLine(content);
                worker.increaseExecutionInfoValue('lines', 1);
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
            worker.increaseExecutionInfoValue('splitFileLength', 1);

            // get total of files to return
            parts.ordered > splitLength && (splitLength = parts.ordered);
        },
        true,
    );

    return { splitLength, header };
};

export { split };
