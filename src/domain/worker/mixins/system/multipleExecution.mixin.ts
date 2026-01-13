import { isNumber, random, uniqueId } from 'lodash';

import { applyMixins } from 'node-labs/lib/utils/mixin';

import { ModuleStructureProperties } from '../../../../interfaces/stageParts.interface';
import { StageExecutionInterface, StageUidAndExecutionUid } from '../../../../interfaces/stageExecution.interface';
import { BodyInterface } from '../../../../interfaces/body.interface';

// Exemplos de funções no executionUid:
// :today() - substitui pela data atual no formato YYYYMMDD
// :now() - substitui pela data e hora atual no formato YYYYMMDDHHMMSSmmm
// :stageuid() - substitui pelo stageUid atual, com caracteres especiais substituídos por '-'
// :index() - substitui pelo index atual
// :keep() - mantém o executionUid atual (útil quando combinado com o encaminhamento de executionUid)
// :random() - substitui por um número aleatório (dois números de 3 dígitos separados por '_')
// :uniqueid() - substitui por um uniqueId gerado
// :count() / :counter() - substitui por um contador que incrementa a cada chamada em todas as instâncias desta classe
export abstract class MultipleExecutionMixin {
    abstract body: BodyInterface;
    abstract uniqueId: string;
    // for index definition
    abstract stageExecution: StageExecutionInterface;
    abstract index: number;

    getStageExecutionSplitter() {
        return '#';
    }

    setIndex() {
        this.index = this.defineIndex();
        // console.log(`Final index: "${this.index}"`);
    }

    getIndex(): number {
        if (this.index === undefined || this.index === null) {
            const index = this.defineIndex();
            // console.log(`temp index: "${index}"`);

            return index;
        }
        return this.index;
    }

    defineIndex(): number {
        const bodyIndex = this.body.options?.index;
        const stageExecutionIndex = this['stageExecution']?.data?.options?.index;

        // console.log(`stageExecutionIndex: "${stageExecutionIndex}", bodyIndex: "${bodyIndex}"`, isNumber(stageExecutionIndex));

        let index = isNumber(stageExecutionIndex) ? stageExecutionIndex : bodyIndex;
        index = index === undefined || index === null || index === false ? -1 : +index;

        return index;
    }

    getUniqueIdByIndex(length = 10): number {
        const index = this.getIndex() === -1 ? 0 : this.getIndex();
        const _uniqueId = uniqueId();

        return +[index, _uniqueId.padStart(length, '0')].join('');
    }

    separateModuleUidAndStageName(stageUid: string) {
        const _stageUid = this.separateStageUidAndExecutionUid(stageUid).stageUid;
        const [moduleUid, ...stageNameParts] = _stageUid.split('/');
        return { moduleUid, stageName: stageNameParts.join('/') };
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

    _buildExecutionUid_index(executionUid_, options: any = {}) {
        if (!executionUid_) return executionUid_;
        if (!options.index) throw new Error('executionUid: index builder cannot be used here');
        return executionUid_.replace(':index()', options.index);
    }

    _buildExecutionUid_keep(executionUid_, options: any = {}) {
        if (!executionUid_) return executionUid_;
        // disabled to allow process to move on if there is no exec uid
        // if (!options.executionUid) throw new Error('executionUid: keep builder called, but there is no execution uid');
        return executionUid_.replace(':keep()', options.executionUid || '');
    }

    _buildExecutionUid_random(executionUid_) {
        if (!executionUid_) return executionUid_;
        const _random = [random(100, 999) + '', random(100, 999) + ''].join('_');

        return executionUid_.replace(':random()', _random);
    }

    _buildExecutionUid_uniqueid(executionUid_) {
        if (!executionUid_) return executionUid_;
        const uniqueid = uniqueId();

        return executionUid_.replace(':uniqueid()', uniqueid);
    }

    _buildExecutionUid_counter(executionUid_) {
        if (!executionUid_) return executionUid_;
        if (!this['_MultipleExecutionMixinCounter']) this['_MultipleExecutionMixinCounter'] = 0;
        const counter = this['_MultipleExecutionMixinCounter']++;

        return executionUid_.replace(':counter()', counter);
    }

    _buildExecutionUid_count(executionUid_) {
        if (!executionUid_) return executionUid_;
        if (!this['_MultipleExecutionMixinCount']) this['_MultipleExecutionMixinCount'] = 0;
        const count = this['_MultipleExecutionMixinCount']++;

        return executionUid_.replace(':count()', count);
    }

    async _buildExecutionUid(executionUid_, options: any = {}) {
        if (!executionUid_) return executionUid_;
        const selfStageUid = options.stageUid || this['stageUid'] || '';
        const selfExecutionUid = options.executionUid || this['executionUid'] || '';
        const selfIndex = options.index || this['getIndex']() || '-1';

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
                    index: selfIndex,
                });
            }
        }

        return executionUid;
    }
    // #endregion
}

export abstract class MultipleExecutionStageMixin extends MultipleExecutionMixin {
    getExecutionUid() {
        const executionUid =
            this.stageExecution && this.stageExecution?.system?.executionUid
                ? this.stageExecution?.system?.executionUid
                : this.executionUid;
        return executionUid || '';
    }

    getStageUidAndExecutionUid() {
        return this.buildCurrentStageUidAndExecutionUid();
    }

    joinStageUidWithCurrentExecutionUid(stageUid: string): string {
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

    getForwardedExecutionUidWithoutAlias() {
        return this.shouldFowardExecutionUid() ? this.executionUid.split('-')[0] : '';
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

    async _prepareStageUidAndExecutionUid(stageUidAndExecutionUid) {
        const { stageUid, executionUid } = this.separateStageUidAndExecutionUid(stageUidAndExecutionUid);
        const executionUid_ = await this._buildExecutionUid(executionUid);
        return this.joinStageUidAndExecutionUid(stageUid, executionUid_);
    }
}

export interface MultipleExecutionStageMixin extends ModuleStructureProperties, MultipleExecutionMixin {}

applyMixins(MultipleExecutionStageMixin, [MultipleExecutionMixin]);
