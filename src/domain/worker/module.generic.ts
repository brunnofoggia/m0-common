import _debug from 'debug';

import { exitRequest } from 'node-labs/lib/utils/errors';
import { applyMixins } from 'node-labs/lib/utils/mixin';

import { StageGeneric } from './stage.generic';
import { SnapshotMixin } from './mixins/snapshot.mixin';

import { BodyInterface } from '../../interfaces/body.interface';
import { ModuleConfigInterface } from '../../interfaces/moduleConfig.interface';
import { StageConfigInterface } from '../../interfaces/stageConfig.interface';
import { ProjectInterface } from '../../interfaces/project.interface';
import { MultipleExecutionStageMixin } from './mixins/system/multipleExecution.mixin';
import { formatExecDate } from '../../utils/execDate';
import { processUniqueId } from './utils/uniqueId';

export abstract class ModuleGeneric {
    static getSolutions;
    protected uniqueId: string;

    body: BodyInterface;

    projectUid: string;
    transactionUid: string;
    moduleUid: string;
    stageUid: string;
    executionUid: string;
    stageName: string;

    moduleConfig: ModuleConfigInterface;
    stageConfig: StageConfigInterface;
    project: ProjectInterface;

    static setSolutions(getSolutions) {
        ModuleGeneric.getSolutions = getSolutions;
        StageGeneric.getSolutions = getSolutions;
    }

    checkBodyStageUid(body) {
        if (!body.stageUid) exitRequest('stageUid not found into message body');
    }

    checkBodyTransaction(body) {
        if (!body.transactionUid) exitRequest('transactionUid must be specified into message body');
    }

    checkBodyProjectOrTransaction(body) {
        if (!body.transactionUid && !body.projectUid) exitRequest('transactionUid or projectUid must be specified into message body');
    }

    abstract _checkBody(body);
    abstract _getBuilderClass();

    protected setUniqueId(_uniqueId = '') {
        !_uniqueId && (_uniqueId = processUniqueId());
        return (this.uniqueId = _uniqueId);
    }

    // @deprecated to be removed. changed to setBody
    set(body: BodyInterface) {
        this.setBody(body);
    }

    setBody(body: BodyInterface) {
        const [moduleUid, stageKey] = body.stageUid.split('/');
        const { stageUid, executionUid } = this.separateStageUidAndExecutionUid(body.stageUid);

        this.transactionUid = body.transactionUid || '';
        this.projectUid = body.projectUid || '';
        this.moduleUid = moduleUid;
        this.stageName = stageKey;
        this.stageUid = stageUid;
        if (body.date) body.date = formatExecDate(body.date);

        this.body = body;

        // only after set body property
        this.executionUid = body.executionUid = this._buildExecutionUid(body.executionUid || executionUid);

        this.body.options = this.body.options || {};
    }

    _getBuilderOptions() {
        return {
            projectUid: this.projectUid,
            transactionUid: this.transactionUid,
            moduleUid: this.moduleUid,
            stageUid: this.stageUid,
            stageName: this.stageName,
            executionUid: this.executionUid,
            body: this.body,
            moduleConfig: this.moduleConfig,
            stageConfig: this.stageConfig,
        };
    }

    async _builderFactory() {
        const BuilderClass = await this._getBuilderClass();
        const builder = new BuilderClass(this._getBuilderOptions());

        return builder;
    }
}

export interface ModuleGeneric extends SnapshotMixin, MultipleExecutionStageMixin {}

applyMixins(ModuleGeneric, [SnapshotMixin, MultipleExecutionStageMixin]);
