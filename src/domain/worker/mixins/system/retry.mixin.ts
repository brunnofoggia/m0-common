import { StageStructureProperties } from '../../../../interfaces/stageParts.interface';

export abstract class RetryMixin {
    getRetryInterval(options: any = {}) {
        return (
            options.retryInterval ||
            this.stageConfig.config.retryInterval ||
            this.moduleConfig.config.retryInterval ||
            this.project._config.retryInterval ||
            5
        );
    }

    getRetryLimit() {
        return this.stageConfig.config.retryLimit || this.moduleConfig.config.retryLimit || this.project._config.retryLimit || 3;
    }

    getRetryAttempt(increaseByOne = false) {
        // increaseOne is used to get the current attempt before the stageExecution is updated
        // return (this.stageExecution.error?.length || 0) + +increaseByOne;
        return (this.stageExecution.system?.attempt || 0) + +increaseByOne;
    }

    isFirstAttempt(beforeUpdate = false) {
        const attempt = this.getRetryAttempt(beforeUpdate);
        return attempt === 1;
    }

    isLastAttempt(beforeUpdate = false) {
        const attempt = this.getRetryAttempt(beforeUpdate);
        const limit = this.getRetryLimit();

        return attempt >= limit;
    }

    shouldRetry(beforeUpdate = false) {
        const isLastAttempt = this.isLastAttempt(beforeUpdate);
        const retryDeactivated = this.stageConfig.config.retry === 0 || this.stageConfig.config.retry === false;

        if (retryDeactivated || isLastAttempt) return false;
        return true;
    }
}

export interface RetryMixin extends StageStructureProperties {}
