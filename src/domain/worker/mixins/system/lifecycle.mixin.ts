import _debug from 'debug';
const debug = _debug('worker:lifecycle');

export abstract class LifeCycleMixin {
    abstract logError(error: Error): void;

    async _onInitialize(): Promise<void> {
        try {
            await this.onInitialize();
        } catch (error) {
            debug('error on initialize');
            throw error;
        }
    }

    async onInitialize(): Promise<void> {
        return;
    }

    async _onDestroy(): Promise<void> {
        try {
            await this.onDestroy();
        } catch (error) {
            debug('error on destroy');
            this.logError(error);
        }
    }

    async onDestroy(): Promise<void> {
        return;
    }
}
