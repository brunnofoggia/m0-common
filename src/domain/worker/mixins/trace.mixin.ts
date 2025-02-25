import { Like } from 'typeorm';

import { MXWorker } from '../mx.worker';
import { TraceService } from '../services/trace.service';

const defaultTraceBulkLimit = 100;

export abstract class TraceMixin<ENTITY> {
    abstract isTraceOn: boolean;
    abstract traceBulkLimit: number;
    abstract traceStack: any[];
    abstract getTraceService(): TraceService<ENTITY>;

    // #region Trace
    buildTraceKeyPrefix() {
        const prefix = this.stageConfig.options.traceOutOfExecutionDir ? this.stageDir : this.executionDir;
        const index = this.getIndex() + '';
        return `${prefix}/${index}`;
    }

    buildTraceKey(key) {
        const prefix = this.buildTraceKeyPrefix();
        return `${prefix}/${key}`;
    }

    async addTrace(key, value) {
        if (!this.isTraceOn) return;

        const traceKey = this.buildTraceKey(key);
        const traceValue = value;
        this.traceStack.push({ key: traceKey, value: traceValue });
        await this.clearTraceStackBuffer();
    }

    async findTrace(key) {
        const traceKey = this.buildTraceKey(key);
        return this.getTraceService().findById(traceKey);
    }

    async clearTraceStack() {
        if (!this.isTraceOn) return;
        const prefix = this.buildTraceKeyPrefix();

        await this.getTraceService()
            .getRepository()
            .delete({ key: Like(`${prefix}%`) });
        this.traceStack = [];
    }

    async saveTraceStack() {
        if (!this.isTraceOn) return;

        try {
            await this.getTraceService().insertBulkData(this.traceStack);
        } catch (error) {
            this.setExecutionInfoValue('saveTraceStackError', error.message);
            this.setExecutionInfoValue('saveTraceStackErrorStack', this.traceStack);
        }
        this.traceStack = [];
    }

    async clearTraceStackBuffer() {
        if (!this.isTraceOn) return;
        const traceBulkLimit = this.traceBulkLimit || defaultTraceBulkLimit;
        if (this.traceStack.length < traceBulkLimit) return;

        await this.saveTraceStack();
    }
    // #endregion

    // #region Persistent Trace
    // Peristent trace is used to store trace data that is not cleared
    // so that it can be used to merge data across many retries
    buildPersistentTraceKeyPrefix() {
        const prefix = this.buildTraceKeyPrefix();
        return `/persistent/${prefix}/${this.stageExecution.id}`;
    }

    buildPersistentTraceKeySuffix() {
        const retryAttempt = this.getRetryAttempt() + '';
        return `${retryAttempt}`;
    }

    buildPersistentTraceShortKey(key) {
        const prefix = this.buildPersistentTraceKeyPrefix();
        return `${prefix}/${key}`;
    }

    buildPersistentTraceKey(key) {
        const shortKey = this.buildPersistentTraceShortKey(key);
        const suffix = this.buildPersistentTraceKeySuffix();
        return `${shortKey}/${suffix}`;
    }

    async addPersistentTrace(key, value) {
        if (!this.isTraceOn) return;

        const traceKey = this.buildPersistentTraceKey(key);
        const traceValue = value;
        this.traceStack.push({ key: traceKey, value: traceValue });
        await this.clearTraceStackBuffer();
    }

    async findPersistentTraceList(key) {
        const traceShortKey = this.buildPersistentTraceShortKey(key);
        return this.getTraceService().find({ where: { key: Like(`${traceShortKey}%`) } });
    }
    // #endregion
}

export interface TraceMixin<ENTITY> extends MXWorker {}
