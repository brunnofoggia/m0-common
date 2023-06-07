import _debug from 'debug';
const debug = _debug('worker:stage:monitor');

import { Like } from 'typeorm';
import { DynamicDatabase } from 'node_common/dist/services/dynamicDatabase.service';
import { MemoryUtil } from 'node_common/dist/utils/memory';
import { ProcessUtil } from 'node_common/dist/utils/process';

export class MonitorService<ENTITY> extends DynamicDatabase<ENTITY> {
    protected idAttribute = 'key';
    protected _deleteRecords = true;

    static async _save(key, value) {
        const service = new MonitorService;
        return await service.save(key, value);
    }

    static async save(key, value, retry = 3) {
        let result;
        try {
            result = await MonitorService._save(key, value);
        } catch (err) {
            if (retry)
                return await MonitorService.save(key, value, retry - 1);
            throw err;
        }
        return result;
    }

    async save(key, value) {
        return await this.getRepository().save({ key, value: value + '' });
    }

    async getValue(key) {
        return (
            (await this.getRepository().find({ where: { key } }))[0] || {}
        ).value;
    }

    async clearByPrefix(prefix) {
        return await this.getRepository().delete({
            key: Like(prefix + '%'),
        });
    }

    getPersistentStartKey(name) {
        return [name, 'timerStart'].join('/');
    }

    getPersistentTotalKey(name) {
        return [name, 'timerTotal'].join('/');
    }

    /* process */
    async time(name, persistent = false) {
        const process = ProcessUtil.instance();
        const time = process.time(name);

        if (persistent) {
            name = this.getPersistentStartKey(name);
            await this.save(name, time);
        }
        return process.times[name];
    }

    async timeEnd(name, persistent = false) {
        const process = ProcessUtil.instance();
        if (persistent) process.times[name] = +(await this.getValue(this.getPersistentStartKey(name)));

        const elapsedTime = process.timeEnd(name);

        if (persistent) {
            name = this.getPersistentTotalKey(name);
        }
        await this.save(name, elapsedTime);
        return elapsedTime;
    }

    /* memory */
    memoryInterval(ms = 100, debug = false) {
        const memory = MemoryUtil.instance();
        if (debug) memory.debug();
        memory.memoryInterval(ms);
        memory.memoryCalc();
    }

    async memoryIntervalEnd(name) {
        const memory = MemoryUtil.instance();
        const memoryUsage = memory.memoryIntervalEnd();
        await this.save(name, memoryUsage);
        return memoryUsage;
    }

    async memoryIntervalClear() {
        const memory = MemoryUtil.instance();
        memory.memoryIntervalClear();
    }
}
