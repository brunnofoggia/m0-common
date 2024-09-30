import _debug from 'debug';
const debug = _debug('worker:lifecycle');

import { ResultInterface } from '../../../../interfaces/result.interface';

export abstract class LifeCycleMixin {
    abstract logError(error: any): void;
    // abstract onInitialize(): Promise<void>;
    // abstract onBeforeExecute(): Promise<void>;
    // abstract onAfterExecute(): Promise<void>;
    // abstract onBeforeResult(result: ResultInterface): Promise<any>;
    // abstract onAfterResult(result: ResultInterface): Promise<void>;
    // abstract onDestroy(): Promise<void>;

    async onInitialize(): Promise<void> {}
    async onBeforeExecute(): Promise<void> {}
    async onAfterExecute(): Promise<void> {}
    async onBeforeResult(result: ResultInterface): Promise<any> {}
    async onAfterResult(result: ResultInterface): Promise<void> {}
    async onDestroy(): Promise<void> {}

    async _onInitialize(): Promise<void> {
        try {
            this.onInitialize && (await this.onInitialize());
        } catch (error) {
            debug('error at "_onInitialize"');
            throw error;
        }
    }

    async _onBeforeExecute(): Promise<void> {
        try {
            this.onBeforeExecute && (await this.onBeforeExecute());
        } catch (error) {
            debug('error at "_onBeforeExecute"');
            throw error;
        }
    }

    async _onAfterExecute(): Promise<void> {
        try {
            this.onAfterExecute && (await this.onAfterExecute());
        } catch (error) {
            debug('error at "_onAfterExecute"');
            throw error;
        }
    }

    async _onDestroy(): Promise<void> {
        try {
            this.onDestroy && (await this.onDestroy());
        } catch (error) {
            debug('error at "_onDestroy"');
            this.logError(error);
        }
    }

    async _onBeforeResult(result: ResultInterface): Promise<any> {
        try {
            if (this.onBeforeResult) {
                const _result = await this.onBeforeResult(result);
                if (_result !== undefined) {
                    result = _result;
                }
            }
            return result;
        } catch (error) {
            debug('error at "_onBeforeResult"');
            throw error;
        }
    }

    async _onAfterResult(result: ResultInterface): Promise<void> {
        try {
            this.onAfterResult && (await this.onAfterResult(result));
        } catch (error) {
            debug('error at "_onAfterResult"');
            throw error;
        }
    }
}
