import { applyMixins } from 'node-labs/lib/utils/mixin';
import { ModuleStructureProperties } from '../../../../interfaces/stageParts.interface';
import { StageUidAndExecutionUid } from '../../../../interfaces/stageExecution.interface';

export abstract class MultipleExecutionMixin {
    getStageExecutionSplitter() {
        return '#';
    }

    replaceStageExecutionSplitter(stageUidAndExecutionUid: string, splitter = '/') {
        return stageUidAndExecutionUid.replace(this.getStageExecutionSplitter(), splitter);
    }

    separateStageUidAndExecutionUid(stageUidAndExecUid: string): StageUidAndExecutionUid {
        const [stageUid, executionUid = ''] = stageUidAndExecUid.split(this.getStageExecutionSplitter());
        return { stageUid, executionUid };
    }

    joinStageUidAndExecutionUid(stageUid, executionUid = '') {
        const stageUidAndExecUid = [stageUid];
        if (executionUid) stageUidAndExecUid.push(executionUid);

        return stageUidAndExecUid.join(this.getStageExecutionSplitter());
    }
}

export abstract class MultipleExecutionStageMixin {
    getStageUidAndExecutionUid() {
        return this.buildCurrentStageUidAndExecutionUid();
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

    buildCurrentStageUidAndExecutionUid() {
        return this.buildStageUidAndExecutionUid(this.stageUid, this.executionUid);
    }

    shouldFowardExecutionUid() {
        return /^_/.test(this.executionUid);
    }

    getForwardedExecutionUid() {
        return this.shouldFowardExecutionUid() ? this.executionUid : '';
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

    // #region builders
    _buildExecutionUid_today(executionUid_) {
        if (!executionUid_) return executionUid_;
        return executionUid_.replace(':today()', new Date().toISOString().split('T')[0].replace(/\D+/g, ''));
    }

    _buildExecutionUid_now(executionUid_) {
        if (!executionUid_) return executionUid_;
        return executionUid_.replace(':now()', new Date().toISOString().replace(/\D+/g, ''));
    }

    _buildExecutionUid_stageuid(executionUid_) {
        if (!executionUid_) return executionUid_;
        return executionUid_.replace(':stageuid()', this.stageUid.replace(/[^a-zA-Z0-9_]/g, '-'));
    }

    _buildExecutionUid_keep(executionUid_) {
        if (!executionUid_) return executionUid_;
        return executionUid_.replace(':keep()', this.executionUid);
    }

    _buildExecutionUid(executionUid_) {
        if (!executionUid_) return executionUid_;

        let executionUid = executionUid_;
        if (this.shouldFowardExecutionUid() && !executionUid.startsWith(this.executionUid)) {
            executionUid = [this.executionUid, executionUid].join('-');
        }

        const matches = [...(executionUid_.matchAll(/:(\w+)\(\)/g) || [])];
        for (const match of matches) {
            const fn = match[1];
            if (fn && this[`_buildExecutionUid_${fn}`]) {
                executionUid = this[`_buildExecutionUid_${fn}`](executionUid);
            }
        }

        return executionUid;
    }
    // #endregion

    _prepareStageUidAndExecutionUid(stageUidAndExecutionUid) {
        const { stageUid, executionUid } = this.separateStageUidAndExecutionUid(stageUidAndExecutionUid);
        const executionUid_ = this._buildExecutionUid(executionUid);
        return this.joinStageUidAndExecutionUid(stageUid, executionUid_);
    }
}

export interface MultipleExecutionStageMixin extends ModuleStructureProperties, MultipleExecutionMixin {}

applyMixins(MultipleExecutionStageMixin, [MultipleExecutionMixin]);
