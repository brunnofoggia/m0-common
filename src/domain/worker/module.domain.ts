import _debug from 'debug';
const debug = _debug('worker:module');

import { defaultsDeep, find, size } from 'lodash';
import { HttpStatusCode } from 'axios';

import { exitRequest, throwHttpException } from 'node-labs/lib/utils/errors';

import { ModuleGeneric } from './module.generic';
import { StageGeneric } from './stage.generic';
import { StageWorker } from './stage.worker';

import { BodyInterface } from '../../interfaces/body.interface';
import { ResultInterface } from '../../interfaces/result.interface';

import { SnapshotProvider } from '../../providers/snapshot.provider';
import { ModuleConfigProvider } from '../../providers/moduleConfig.provider';

import { importWorker } from '../../utils/importWorker';
import { ERROR } from '../../types/error.type';
import { StageStatusEnum } from '../../types/stageStatus.type';

export class ModuleDomain extends ModuleGeneric {
    static skipQueues = false;
    builder: StageGeneric;

    fakeResult = false;
    // protected moduleExecution: ModuleExecutionInterface;

    _checkBody(body) {
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

    async initialize(body: BodyInterface): Promise<ResultInterface> {
        debug('-------------------------\ninitialize');
        if (ModuleDomain.skipQueues) return { statusUid: StageStatusEnum.DONE };

        this.setUniqueId();
        debug('set unique id:', this.uniqueId);

        // body
        this._checkBody(body);
        debug('set body');
        this.set(body);
        debug('check body');
        await this.checkData();

        // obtain config
        debug('obtain snapshot');
        await this.getSnapshotConfig();

        debug('check stage config existence');
        if (!this.stageConfig || !size(this.stageConfig)) {
            exitRequest(ERROR.NO_STAGE_CONFIG_FOUND);
        }

        // instantiate the builder
        debug('instantiate builder');
        this.builder = await this._builderFactory();
        this.builder.fakeResult = this.fakeResult;

        // builder initialize
        this.__debug('initialize builder');
        return await this.builder.initialize(this.uniqueId);
    }

    private async __debug(...args) {
        if (!this.fakeResult) {
            debug(...args);
        }
    }

    async _getBuilderClass() {
        const fakeStageUid = (this.body.options?._fakeStageUid || '').split('/');
        const moduleUid = fakeStageUid[0] || this.moduleUid;
        const stageName = fakeStageUid[1] || this.stageName;

        let BuilderClass;
        try {
            const { _class, found } = await this._locateBuilder(moduleUid, stageName);
            this.fakeResult = !found;
            BuilderClass = _class;
            return BuilderClass;
        } catch (error) {
            exitRequest(error);
        }
    }

    async _locateBuilder(moduleUid, stageName): Promise<any> {
        return await importWorker(`modules/${moduleUid}/stages`, stageName, StageWorker._getWorker(this.stageConfig, this.project));
    }

    async getSnapshotConfig() {
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
