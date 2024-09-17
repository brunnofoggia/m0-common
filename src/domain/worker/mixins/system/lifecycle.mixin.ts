import _debug from 'debug';
const debug = _debug('worker:lifecycle');

import { ResultInterface } from '../../../../interfaces/result.interface';

export abstract class LifeCycleMixin {
    abstract logError(error: any): void;
    abstract onBeforeExecute(): Promise<void>;
    abstract onBeforeResult(result: ResultInterface): Promise<void>;
    abstract onAfterResult(result: ResultInterface): Promise<void>;

    async _onInitialize(): Promise<void> {
        try {
            await this.onInitialize();
        } catch (error) {
            debug('error at "_onInitialize"');
            throw error;
        }
    }

    async onInitialize(): Promise<void> {
        return;
    }

    async _onBeforeExecute(): Promise<void> {
        try {
            await this.onBeforeExecute();
        } catch (error) {
            debug('error at "_onBeforeExecute"');
            throw error;
        }
    }

    async _onDestroy(): Promise<void> {
        try {
            await this.onDestroy();
        } catch (error) {
            debug('error at "_onDestroy"');
            this.logError(error);
        }
    }

    async onDestroy(): Promise<void> {
        return;
    }

    async _onBeforeResult(result: ResultInterface): Promise<void> {
        try {
            this.onBeforeResult && (await this.onBeforeResult(result));
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
