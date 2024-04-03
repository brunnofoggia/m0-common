import { applyMixins } from 'node-labs/lib/utils/mixin';
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

    _buildExecutionUid_today(executionUid_) {
        if (!executionUid_) return executionUid_;
        return executionUid_.replace(':today()', new Date().toISOString().split('T')[0].replace(/\D+/g, ''));
    }

    _buildExecutionUid_now(executionUid_) {
        if (!executionUid_) return executionUid_;
        return executionUid_.replace(':now()', new Date().toISOString().replace(/\D+/g, ''));
    }

    _buildExecutionUid(executionUid_) {
        if (!executionUid_) return executionUid_;

        const fn = (executionUid_.match(/:(\w+)\(\)/) || [])[1];
        if (fn && this[`_buildExecutionUid_${fn}`]) {
            executionUid_ = this[`_buildExecutionUid_${fn}`](executionUid_);
        }

        return executionUid_;
    }

    _prepareStageUidAndExecutionUid(stageUidAndExecutionUid) {
        const { stageUid, executionUid } = this.separateStageUidAndExecutionUid(stageUidAndExecutionUid);
        const executionUid_ = this._buildExecutionUid(executionUid);
        return this.joinStageUidAndExecutionUid(stageUid, executionUid_);
    }
}

export abstract class MultipleExecutionStageMixin {
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

    _buildExecutionUid_stageuid(executionUid_) {
        if (!executionUid_) return executionUid_;
        return executionUid_.replace(':stageuid()', this.stageUid);
    }

    _buildExecutionUid_keep(executionUid_) {
        if (!executionUid_) return executionUid_;
        return executionUid_.replace(':keep()', this.executionUid);
    }
}

export interface MultipleExecutionStageMixin extends ModuleStructureProperties, MultipleExecutionMixin {}

applyMixins(MultipleExecutionStageMixin, [MultipleExecutionMixin]);
