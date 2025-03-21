import _ from 'lodash';
import _debug from 'debug';
const debug = _debug('worker:handler:insert');
const log = _debug('worker:handler:essential:insert');

import { splitFile } from '../../../utils/split';
import { StageWorker } from '../stage.worker';

const prepareInsertOptions = (_options) => {
    const defaultOptions = {
        bulkLimit: 5000,
    };

    return _.defaults(_options, defaultOptions);
};

export const insert = async (worker: StageWorker, service, getData, monitorService = null) => {
    const { stageConfig, body, rootDir, stageDir, executionUid } = worker.get();

    const key = _.camelCase([stageConfig.stageUid, 'process'].join('/'));
    const monitorKey = [stageDir, body.options.index].join('/');
    const monitorTimeKey = [monitorKey, 'time'].join('/');
    const monitorMemKey = [monitorKey, 'memory'].join('/');

    monitorService?.time(monitorTimeKey);
    monitorService?.memoryInterval();

    const options = prepareInsertOptions(stageConfig.options);
    const { storage } = await worker._getSolutions();
    const fromDir = [rootDir, options.input?.dir || worker.getFirstPrevStage()].join('/');
    const fromPath_ = [fromDir];
    if (executionUid && !options._ignoreExecutionUidForStorage) {
        fromPath_.push(executionUid);
    }
    fromPath_.push(body.options.index);

    let fromPath = fromPath_.join('/');
    if (options.fileExtension) fromPath += '.' + options.fileExtension;

    await service.checkIfTableExists();

    const createFileStream = async () => await readStream(fromPath, storage);
    const fileStream = await createFileStream();
    if (!fileStream) return;

    const queryRunner = service.getDataSource().createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let done = false;
    let error;
    try {
        await splitFile(createFileStream, options, [], getData, async (splitNumber, content, parts) => {
            await service.insertBulkData(content, queryRunner);
            parts.finished++;
            worker.increaseExecutionInfoValue('inserted', content.length);
        });
        await queryRunner.commitTransaction();
        done = true;
        debug(`commit`);
    } catch (_error) {
        error = _error;
        debug(`rollback`);
        // since we have errors let's rollback changes we made
        await queryRunner.rollbackTransaction();
    } finally {
        // you need to release query runner which is manually created:
        await queryRunner.release();
        debug(`release`);
    }

    // await statePersist(uid, input);

    const timeSpent = await monitorService?.timeEnd(monitorTimeKey);
    await monitorService?.memoryIntervalEnd(monitorMemKey);
    debug(`timer ${key}: `, timeSpent);

    if (!done) throw error;
    // return sendResponse(200, { message: `process ${uid} called` });
};

const readStream = async (fromPath, storage) => {
    try {
        debug(`reading file: ${fromPath}`);
        await storage.getFileInfo(fromPath);
        return await storage.readStream(fromPath);
    } catch (error) {
        log(`file not found: ${fromPath}`);
        error.message = `file not found at "${fromPath}". ${error.message}`;
        throw error;
    }
};
