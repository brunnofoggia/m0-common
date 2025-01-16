import { uniqueId } from 'lodash';
import { TransferProvider } from '../../../../providers/transfer.provider';
import { BodyInterface } from '../../../../interfaces/body.interface';
import { StageExecutionInterface } from '../../../../interfaces/stageExecution.interface';
import { MessageMixin } from './message.mixin';

export abstract class StackTriggerMixin {
    abstract stageExecution: StageExecutionInterface;
    abstract stackTriggers: Array<BodyInterface>;
    abstract worflowEventName: string;

    getStackedTriggers() {
        return this.stackTriggers;
    }

    addTriggerToStack(body: BodyInterface) {
        this.stackTriggers.push(body);
    }

    getStageTriggerStackPrefix(stageExecutionId) {
        return `trigger:${stageExecutionId}:`;
    }

    async saveTrigger(stageExecutionId, body) {
        const prefix = this.getStageTriggerStackPrefix(stageExecutionId);
        const key = `${prefix}${uniqueId()}`;

        return await TransferProvider.create(key, body);
    }

    async findStageTriggerStack(stageExecutionId) {
        const prefix = this.getStageTriggerStackPrefix(stageExecutionId);
        const results = await TransferProvider.findAllByPrefix(prefix);
        return results.map((result) => JSON.parse(result.text));
    }

    async clearStageTriggerStack(stageExecutionId) {
        const prefix = this.getStageTriggerStackPrefix(stageExecutionId);
        return await TransferProvider.removeAllByPrefix(prefix);
    }

    async saveTriggerStack() {
        const _stackTriggers = this.getStackedTriggers() || [];
        // const saveTriggerStack = !!+process.env.TRANSFERSTACKTRIGGERS;
        // if (!saveTriggerStack) return;
        if (!_stackTriggers.length) return;

        await this.clearStageTriggerStack(this.stageExecution.id);
        for (const body of _stackTriggers) {
            await this.saveTrigger(this.stageExecution.id, body);
        }

        this.stackTriggers = [];
    }

    async triggerStackDispatch(stackTriggers = null) {
        const _stackTriggers = stackTriggers || this.getStackedTriggers() || [];
        // const sendTriggerStack = !+process.env.TRANSFERSTACKTRIGGERS;
        // if (!sendTriggerStack) return;
        if (!_stackTriggers.length) return;

        for (const body of _stackTriggers) {
            await this.triggerStageToDefaultProvider(this.worflowEventName, body);
        }

        this.stackTriggers = [];
    }

    async triggerSavedStack() {
        const stackTriggers = await this.findStageTriggerStack(this.stageExecution.id);
        await this.triggerStackDispatch(stackTriggers);
        await this.clearStageTriggerStack(this.stageExecution.id);
    }
}

export interface StackTriggerMixin extends MessageMixin {}
