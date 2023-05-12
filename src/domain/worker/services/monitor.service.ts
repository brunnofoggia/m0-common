import _debug from 'debug';
const debug = _debug('app:monitor');

import { DynamicDatabase } from 'node_common/dist/services/dynamicDatabase.service';

export class MonitorService<ENTITY> extends DynamicDatabase<ENTITY> {
    protected idAttribute = 'key';
    protected _deleteRecords = true;
    times: any = {};
    memoryUsage = 0;
    _memoryInterval;

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

    async time(name, persistent = false) {
        // if (MonitorService.times[name])
        //     throw new Error(`There is another time with the name ${name}`);
        this.times[name] = Date.now();
        if (persistent) {
            await this.save(this.getPersistentStartKey(name), this.times[name]);
        }
        return this.times[name];
    }

    async timeEnd(name, persistent = false) {
        if (persistent) this.times[name] = +(await this.getValue(this.getPersistentStartKey(name)));
        if (!this.times[name]) {
            debug(`There is no time with the name ${name}`);
            throw new Error(`There is no time with the name ${name}`);
        }
        const start = this.times[name];
        this.times[name] = null;
        if (persistent) name = this.getPersistentTotalKey(name);
        return this.saveElapsedTime(name, start);
    }

    getPersistentStartKey(name) {
        return [name, 'timerStart'].join('/');
    }

    getPersistentTotalKey(name) {
        return [name, 'timerTotal'].join('/');
    }

    async saveElapsedTime(name, start, end = null) {
        const elapsedTime = this.formatElapsedTime(this.calcElapsedTime(start, end));

        await this.save(name, elapsedTime);
        return elapsedTime;
    }

    calcElapsedTime(start, end = null) {
        end === null && (end = Date.now());
        return end - start;
    }

    formatElapsedTime(elapsedTime) {
        const minutes = Math.floor(elapsedTime / 60000);
        const remainingTime = elapsedTime - (minutes * 60000);
        const seconds = Math.floor(remainingTime / 1000);

        return `${minutes}m${seconds}s`;
    }

    memoryCalc() {
        const memoryUsage = process.memoryUsage();
        if (memoryUsage.rss > this.memoryUsage) {
            this.memoryUsage = memoryUsage.rss;
        }
        debug(`Uso de memória: ${this.formatMemory(memoryUsage.rss)}MB`);
    }

    memoryInterval(ms = 100) {
        clearInterval(this._memoryInterval);
        this.memoryUsage = 0;

        this.memoryCalc();
        this._memoryInterval = setInterval(() => this.memoryCalc(), ms);
    }

    async memoryIntervalEnd(name) {
        this.memoryIntervalClear();
        const memoryUsage = this.formatMemory(this.memoryUsage) + 'MB';
        this.memoryUsage = 0;

        await this.save(name, memoryUsage);
        return memoryUsage;
    }

    async memoryIntervalClear() {
        clearInterval(this._memoryInterval);
    }

    formatMemory(memoryUsage) {
        return (memoryUsage / (1024 * 1024)).toFixed(2);
    }

    async getValue(key) {
        return (
            (await this.getRepository().find({ where: { key } }))[0] || {}
        ).value;
    }
}
