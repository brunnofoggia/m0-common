import { bind, uniqueId } from 'lodash';
import { exitRequest } from 'node-labs/lib/utils/errors';
import { applyMixins } from 'node-labs/lib/utils/mixin';

import { StageGeneric } from './stage.generic';
import { SnapshotMixin } from './mixins/snapshot.mixin';

import { BodyInterface } from '../../interfaces/body.interface';
import { ModuleConfigInterface } from '../../interfaces/moduleConfig.interface';
import { StageConfigInterface } from '../../interfaces/stageConfig.interface';
import { ProjectInterface } from '../../interfaces/project.interface';

export abstract class ModuleGeneric {
    static getSolutions;
    protected uniqueId: string;

    body: BodyInterface;
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
        !_uniqueId && (_uniqueId = [uniqueId('worker:'), new Date().toISOString()].join(':'));
        return (this.uniqueId = _uniqueId);
    }

    set(body: BodyInterface) {
        const [moduleUid, stageKey] = body.stageUid.split('/');
        const { stageUid, executionUid } = this.separateStageUidAndExecutionUid(body.stageUid);

        this.transactionUid = body.transactionUid || '';
        this.moduleUid = moduleUid;
        this.stageName = stageKey;
        this.stageUid = stageUid;
        this.executionUid = body.executionUid || executionUid;

        this.body = body;
        this.body.options = this.body.options || {};
    }

    separateStageUidAndExecutionUid(stageUid) {
        return bind(StageGeneric.prototype.separateStageUidAndExecutionUid, this)(stageUid);
    }

    async _builderFactory() {
        const BuilderClass = await this._getBuilderClass();
        const builder = new BuilderClass({
            transactionUid: this.transactionUid,
            moduleUid: this.moduleUid,
            stageUid: this.stageUid,
            executionUid: this.executionUid,
            stageName: this.stageName,
            body: this.body,
            moduleConfig: this.moduleConfig,
            stageConfig: this.stageConfig,
        });

        return builder;
    }
}

export interface ModuleGeneric extends SnapshotMixin {}

applyMixins(ModuleGeneric, [SnapshotMixin]);
