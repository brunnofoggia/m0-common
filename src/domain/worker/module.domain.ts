import _debug from 'debug';
const debug = _debug('worker:module');

import { size, uniqueId } from 'lodash';
import { HttpStatusCode } from 'axios';

import { applyMixins } from 'node-common/dist/utils/mixin';
import { exitRequest, throwHttpException } from 'node-common/dist/utils/errors';

import { importWorker } from '../../utils/importWorker';
import { ModuleWorker } from './module.worker';
import { StageWorker } from './stage.worker';
import { ModuleConfigInterface } from '../../interfaces/moduleConfig.interface';
import { StageConfigInterface } from '../../interfaces/stageConfig.interface';
import { SnapshotProvider } from '../../providers/snapshot.provider';
import { BodyInterface } from '../../interfaces/body.interface';
import { ProjectInterface } from '../../interfaces/project.interface';

import { SnapshotMixin } from './mixins/snapshot.mixin';
import { ModuleConfigProvider } from '../../providers/moduleConfig.provider';
import { ERROR } from '../../types/error.type';

export class ModuleDomain {
    static getSolutions;
    static skipQueues = false;

    private fakeResult = false;
    private uniqueId: string;
    private body: BodyInterface;
    private builder: StageWorker;

    private transactionUid: string;
    private moduleUid: string;
    private stageUid: string;
    private stageName: string;

    // private moduleExecution: ModuleExecutionInterface;
    private moduleConfig: ModuleConfigInterface;
    private stageConfig: StageConfigInterface;
    private project: ProjectInterface;

    static setSolutions(getSolutions) {
        ModuleDomain.getSolutions = getSolutions;
        StageWorker.getSolutions = getSolutions;
    }

    async check() {
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

    async initialize(body: BodyInterface) {
        debug('-------------------------\ninitialize');
        if (ModuleDomain.skipQueues) return true;

        this.setUniqueId();
        debug('set unique id:', this.uniqueId);

        // body
        debug('set body');
        this.set(body);
        debug('check body');
        await this.check();

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

    private setUniqueId(_uniqueId = '') {
        !_uniqueId && (_uniqueId = [uniqueId('worker:'), new Date().toISOString()].join(':'));
        return (this.uniqueId = _uniqueId);
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
        this.moduleConfig = this['buildSnapshot'](this.moduleConfig || {}, this.body.mergeSnapshot);

        this.stageConfig = ModuleWorker.getConfig(this.stageUid, this.moduleConfig || {});
        this.project = this.moduleConfig?.project;
    }
}

applyMixins(ModuleDomain, [SnapshotMixin]);
