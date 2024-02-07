import { ModuleStructureProperties } from '../../../../interfaces/stageParts.interface';

export abstract class MultipleExecutionMixin {
    getStageExecutionSplitter() {
        return '#';
    }

    separateStageUidAndExecutionUid(stageUidAndExecUid) {
        const [stageUid, executionUid = ''] = stageUidAndExecUid.split(this.getStageExecutionSplitter());
        return { stageUid, executionUid };
    }

    joinStageUidAndExecutionUid(stageUid, executionUid = '') {
        const stageUidAndExecUid = [stageUid];
        if (executionUid) stageUidAndExecUid.push(executionUid);

        return stageUidAndExecUid.join(this.getStageExecutionSplitter());
    }

    joinStageUidWithCurrentExecutionUid(stageUid) {
        return this.joinStageUidAndExecutionUid(stageUid, this.executionUid);
    }

    buildStageUidAndExecutionUid(stageUid = '', executionUid = '') {
        if (!stageUid) stageUid = this.stageUid;
        return this.joinStageUidAndExecutionUid(stageUid, executionUid);
    }

    buildStageUidWithCurrentExecutionUid(stageUid = '') {
        return this.buildStageUidAndExecutionUid(stageUid, this.executionUid);
    }

    shouldFowardExecutionUid() {
        return /^_/.test(this.executionUid);
    }

    // trick to execute the workflow everyday
    fowardExecutionUid(stageUidAndExecutionUid_) {
        let stageUidAndExecutionUid = stageUidAndExecutionUid_;
        const { stageUid, executionUid } = this.separateStageUidAndExecutionUid(stageUidAndExecutionUid_);

        if (!executionUid && this.shouldFowardExecutionUid()) {
            stageUidAndExecutionUid = this.joinStageUidAndExecutionUid(stageUid, this.executionUid);
        }
        return stageUidAndExecutionUid;
    }

    fowardExecutionUidToList(stageUidAndExecutionUidList) {
        return stageUidAndExecutionUidList.map((stageUidAndExecutionUid) => this.fowardExecutionUid(stageUidAndExecutionUid));
    }
}

export interface MultipleExecutionMixin extends ModuleStructureProperties {}
