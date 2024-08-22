import { applyMixins } from 'node-labs/lib/utils/mixin';
import { ModuleStructureProperties } from '../../../../interfaces/stageParts.interface';
import { StageUidAndExecutionUid } from '../../../../interfaces/stageExecution.interface';

export abstract class MultipleExecutionMixin {
    separateModuleUidAndStageName(stageUid: string) {
        const _stageUid = this.separateStageUidAndExecutionUid(stageUid).stageUid;
        const [moduleUid, ...stageNameParts] = _stageUid.split('/');
        return { moduleUid, stageName: stageNameParts.join('/') };
    }

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

    shouldFowardExecutionUid(options: any = {}) {
        const executionUid = options.executionUid || this['executionUid'] || '';
        return /^_/.test(executionUid);
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

    _buildExecutionUid_stageuid(executionUid_, options: any = {}) {
        if (!executionUid_) return executionUid_;
        if (!options.stageUid) throw new Error('executionUid: stageuid builder cannot be used here');
        return executionUid_.replace(':stageuid()', options.stageUid.replace(/[^a-zA-Z0-9_]/g, '-'));
    }

    _buildExecutionUid_keep(executionUid_, options: any = {}) {
        if (!executionUid_) return executionUid_;
        // disabled to allow process to move on if there is no exec uid
        // if (!options.executionUid) throw new Error('executionUid: keep builder called, but there is no execution uid');
        return executionUid_.replace(':keep()', options.executionUid || '');
    }

    _buildExecutionUid(executionUid_, options: any = {}) {
        if (!executionUid_) return executionUid_;
        const selfStageUid = options.stageUid || this['stageUid'] || '';
        const selfExecutionUid = options.executionUid || this['executionUid'] || '';

        let executionUid = executionUid_;
        if (this.shouldFowardExecutionUid() && !executionUid.startsWith(selfExecutionUid)) {
            // avoid duplicating forwarded executionUid
            if (executionUid.indexOf(':keep()') >= 0) {
                executionUid = executionUid.replace(':keep()', '');
            }
            const composeExecUid = [selfExecutionUid];
            if (executionUid) composeExecUid.push(executionUid);

            executionUid = composeExecUid.join('-');
        }

        const matches = [...(executionUid.matchAll(/:(\w+)\(\)/g) || [])];
        for (const match of matches) {
            const fn = match[1];
            if (fn && this[`_buildExecutionUid_${fn}`]) {
                executionUid = this[`_buildExecutionUid_${fn}`](executionUid, {
                    stageUid: selfStageUid,
                    executionUid: selfExecutionUid,
                });
            }
        }

        return executionUid;
    }
    // #endregion
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

    _prepareStageUidAndExecutionUid(stageUidAndExecutionUid) {
        const { stageUid, executionUid } = this.separateStageUidAndExecutionUid(stageUidAndExecutionUid);
        const executionUid_ = this._buildExecutionUid(executionUid);
        return this.joinStageUidAndExecutionUid(stageUid, executionUid_);
    }
}

export interface MultipleExecutionStageMixin extends ModuleStructureProperties, MultipleExecutionMixin {}

applyMixins(MultipleExecutionStageMixin, [MultipleExecutionMixin]);
