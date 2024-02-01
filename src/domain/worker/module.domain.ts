import _debug from 'debug';
const debug = _debug('worker:module');

import { defaultsDeep, find, size, uniqueId } from 'lodash';
import { HttpStatusCode } from 'axios';

import { applyMixins } from 'node-labs/lib/utils/mixin';
import { exitRequest, throwHttpException } from 'node-labs/lib/utils/errors';

import { importWorker } from '../../utils/importWorker';
import { StageWorker } from './stage.worker';
import { ModuleConfigInterface } from '../../interfaces/moduleConfig.interface';
import { StageConfigInterface } from '../../interfaces/stageConfig.interface';
import { SnapshotProvider } from '../../providers/snapshot.provider';
import { BodyInterface } from '../../interfaces/body.interface';
import { ProjectInterface } from '../../interfaces/project.interface';

import { SnapshotMixin } from './mixins/snapshot.mixin';
import { ModuleConfigProvider } from '../../providers/moduleConfig.provider';
import { ERROR } from '../../types/error.type';
import { ResultInterface } from '../../interfaces/result.interface';
import { StageStatusEnum } from '../../types/stageStatus.type';
import { ModuleGeneric } from './module.generic';
import { StageGeneric } from './stage.generic';

export class ModuleDomain extends ModuleGeneric {
    static getSolutions;

    static skipQueues = false;
    protected body: BodyInterface;
    protected builder: StageGeneric;

    protected transactionUid: string;
    protected moduleUid: string;
    protected stageUid: string;
    protected stageName: string;

    protected moduleConfig: ModuleConfigInterface;
    protected stageConfig: StageConfigInterface;

    protected fakeResult = false;
    protected project: ProjectInterface;

    // protected moduleExecution: ModuleExecutionInterface;

    static setSolutions(getSolutions) {
        ModuleDomain.getSolutions = getSolutions;
        StageWorker.getSolutions = getSolutions;
    }

    checkBody(body) {
        this.checkBodyStageUid(body);
        this.checkBodyTransaction(body);
    }

    async checkData() {
        if (this.body.mockStageExecution) return;
        const config = await ModuleConfigProvider.findConfig(this.transactionUid, this.moduleUid);
        if (!config || !size(config)) {
            throwHttpException(ERROR.TRANSACTIONUID_NOT_INITIALIZED, HttpStatusCode.Ok);
        }
    }

    set(body: BodyInterface) {
        const [moduleUid, stageKey] = body.stageUid.split('/');
        this.transactionUid = body.transactionUid || '';
        this.moduleUid = moduleUid;
        this.stageName = stageKey;
        this.stageUid = body.stageUid;

        this.body = body;
        this.body.options = this.body.options || {};
    }

    async initialize(body: BodyInterface): Promise<ResultInterface> {
        debug('-------------------------\ninitialize');
        if (ModuleDomain.skipQueues) return { statusUid: StageStatusEnum.DONE };

        this.setUniqueId();
        debug('set unique id:', this.uniqueId);

        // body
        this.checkBody(body);
        debug('set body');
        this.set(body);
        debug('check body');
        await this.checkData();

        // obtain config
        debug('obtain snapshot');
        await this.snapshotConfig();

        debug('check stage config existence');
        if (!this.stageConfig || !size(this.stageConfig)) {
            exitRequest(ERROR.NO_STAGE_CONFIG_FOUND);
        }

        // instantiate the builder
        debug('instantiate builder');
        this.builder = await this.builderFactory();

        // builder initialize
        this.__debug('initialize builder');
        return await this.builder.initialize(this.uniqueId);
    }

    private async __debug(...args) {
        if (!this.fakeResult) {
            debug(...args);
        }
    }

    private async builderFactory() {
        const fakeStageUid = (this.body.options?._fakeStageUid || '').split('/');
        const moduleUid = fakeStageUid[0] || this.moduleUid;
        const stageName = fakeStageUid[1] || this.stageName;

        let builderClass;
        try {
            const { _class, found } = await this.locateBuilder(moduleUid, stageName);
            this.fakeResult = !found;
            builderClass = _class;
        } catch (error) {
            exitRequest(error);
        }

        const builder = new builderClass({
            transactionUid: this.transactionUid,
            moduleUid: this.moduleUid,
            stageUid: this.stageUid,
            stageName: this.stageName,
            body: this.body,
            moduleConfig: this.moduleConfig,
            stageConfig: this.stageConfig,
        });
        builder.fakeResult = this.fakeResult;

        return builder;
    }

    private async locateBuilder(moduleUid, stageName): Promise<any> {
        return await importWorker(`modules/${moduleUid}/stages`, stageName, StageWorker._getWorker(this.stageConfig, this.project));
    }

    private async snapshotConfig() {
        if (!this.body.mockStageExecution) this.moduleConfig = await SnapshotProvider.find(this.transactionUid, this.body.stageUid);
        this.moduleConfig = this.buildSnapshot((this.moduleConfig || {}) as never, this.body.mergeSnapshot);

        this.stageConfig = this.getStageConfigFromSnapshot(this.stageUid, this.moduleConfig || {});
        this.project = this.moduleConfig?.project;
    }

    getStageConfigFromSnapshot(stageUid, moduleConfig) {
        const stageConfig = moduleConfig.stageConfig || {};
        const foundStageConfig = find(moduleConfig.stagesConfig || [], (stage) => stage.stageUid === stageUid);

        // allow to merge snapshot with stage config on worker
        return defaultsDeep(foundStageConfig || {}, stageConfig);
    }
}

export interface ModuleDomain extends SnapshotMixin {}

applyMixins(ModuleDomain, [SnapshotMixin]);
