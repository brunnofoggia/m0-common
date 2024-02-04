import { StageStructureProperties } from '../../../../interfaces/stageParts.interface';

export abstract class RetryMixin {
    getRetryLimit() {
        return this.stageConfig.config.retryLimit || this.moduleConfig.config.retryLimit || this.project._config.retryLimit || 3;
    }

    getRetryAttempt(increaseByOne = false) {
        return (this.stageExecution.error?.length || 0) + +increaseByOne;
    }

    isLastAttempt() {
        const attempt = this.getRetryAttempt();
        const limit = this.getRetryLimit();

        return attempt >= limit;
    }
}

export interface RetryMixin extends StageStructureProperties {}
