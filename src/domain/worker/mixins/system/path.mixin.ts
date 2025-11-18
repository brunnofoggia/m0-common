import dayjs from 'dayjs';
import { StageUidAndExecutionUid } from '../../../../interfaces/stageExecution.interface';
import { StageStructureProperties } from '../../../../interfaces/stageParts.interface';
import { MODULE } from '../../../../types/module.type';
import { DateMixin } from './date.mixin';

export interface PathProperties {
    m0Path: string;
    globalPath: string;
    globalDatedPath: string;
    // new names
    transactionPath: string;
    modulePath: string;
    stagePath: string;
    executionPath: string;
    projectSharedPath: string;
    // new names end
    // legacy names
    rootDir: string;
    moduleDir: string;
    stageDir: string;
    executionDir: string;
    projectSharedDir: string;
    // legacy names end

    projectPath: string;
    projectModulePath: string;
    projectStagePath: string;

    sharedPath: string;
    sharedModulePath: string;
    sharedStagePath: string;
}

export abstract class PathMixin {
    // #region abstract
    abstract getProjectUid(): string;
    abstract getEnv(): string;
    abstract getFakeEnv(): string;
    abstract separateStageUidAndExecutionUid(stageUidAndExecUid: string): StageUidAndExecutionUid;
    // #endregion

    // #region path properties
    // new names
    transactionPath: string;
    modulePath: string;
    stagePath: string;
    executionPath: string;
    // new names end
    // legacy names
    rootDir: string;
    moduleDir: string;
    stageDir: string;
    executionDir: string;
    // legacy names end

    globalPath: string;
    globalDatedPath: string;
    m0Path: string;
    projectPath: string;
    projectModulePath: string;
    projectStagePath: string;
    projectSharedPath: string;

    sharedPath: string;
    sharedModulePath: string;
    sharedStagePath: string;
    // #endregion

    // #region getters
    getStorageEnv() {
        return process.env.STORAGE_ENV || this.getFakeEnv();
    }

    getM0Path() {
        return this.m0Path;
    }

    getGlobalPath() {
        return this.globalPath;
    }

    getGlobalDatedPath() {
        return this.globalDatedPath;
    }

    getRootDir() {
        return this.transactionPath;
    }

    getModuleDir() {
        return this.modulePath;
    }

    getStageDir() {
        return this.stagePath;
    }

    getExecutionDir() {
        return this.executionPath;
    }

    getProjectPath() {
        return this.projectPath;
    }

    getProjectModulePath() {
        return this.projectModulePath;
    }

    getProjectStagePath() {
        return this.projectStagePath;
    }

    getAllPaths(): PathProperties {
        return {
            m0Path: this.m0Path,
            globalPath: this.globalPath,
            globalDatedPath: this.globalDatedPath,
            // new names
            transactionPath: this.transactionPath,
            modulePath: this.modulePath,
            stagePath: this.stagePath,
            executionPath: this.executionPath,
            projectSharedPath: this.projectSharedPath,
            // new names end
            // legacy names
            rootDir: this.transactionPath,
            moduleDir: this.modulePath,
            stageDir: this.stagePath,
            executionDir: this.executionPath,
            projectSharedDir: this.projectSharedPath,
            // legacy names end
            projectPath: this.projectPath,
            projectModulePath: this.projectModulePath,
            projectStagePath: this.projectStagePath,
            sharedPath: this.sharedPath,
            sharedModulePath: this.sharedModulePath,
            sharedStagePath: this.sharedStagePath,
        };
    }
    // #endregion

    // #region path setters
    setPaths() {
        this.setM0Path();
        this.setGlobalPath();
        this.setGlobalDatedPath();

        this.setPathRoot();
        this.setPathModule();
        this.setPathStage();
        this.setProjectSharedPath();

        this.setSharedPath();
        this.setSharedModulePath();
        this.setSharedStagePath();
    }

    setPathRoot() {
        this.projectPath = this.getProjectUid();
        this.transactionPath = this.buildRootDir();
        this.rootDir = this.transactionPath;
    }

    setPathModule() {
        this.modulePath = [this.transactionPath, this.moduleConfig.moduleUid].join('/');
        this.moduleDir = this.modulePath;
        this.projectModulePath = [this.projectPath, this.moduleUid].join('/');
    }

    setPathStage() {
        const stagePath = [this.transactionPath, this.stageConfig.stageUid];
        this.stagePath = stagePath.join('/');
        this.stageDir = this.stagePath;

        if (this.executionUid) stagePath.push(this.executionUid);
        this.executionPath = stagePath.join('/');
        this.executionDir = this.executionPath;

        this.projectStagePath = [this.projectPath, this.stageUid].join('/');
    }

    setProjectSharedPath() {
        const projectSharedPath = [];
        projectSharedPath.push(this.projectPath);
        projectSharedPath.push('shared');

        this.projectSharedPath = projectSharedPath.join('/');
    }

    setM0Path() {
        const dir = [];
        dir.push(MODULE.M0);

        this.m0Path = dir.join('/');
    }

    setGlobalPath() {
        const dir = [];
        dir.push(MODULE.MX);

        this.globalPath = dir.join('/');
    }

    setGlobalDatedPath() {
        const dir = [this.globalPath];
        dir.push(this.getDate().format('YYYYMMDD'));

        this.globalDatedPath = dir.join('/');
    }

    setSharedPath() {
        const sharedPath = [];
        sharedPath.push(MODULE.SHARED);

        this.sharedPath = sharedPath.join('/');
    }

    setSharedModulePath() {
        const sharedModulePath = [];
        sharedModulePath.push(this.sharedPath);
        sharedModulePath.push(this.moduleConfig.moduleUid);

        this.sharedModulePath = sharedModulePath.join('/');
    }

    setSharedStagePath() {
        const sharedStagePath = [];
        sharedStagePath.push(this.sharedPath);
        sharedStagePath.push(this.stageConfig.stageUid);

        this.sharedStagePath = sharedStagePath.join('/');
    }
    // #endregion

    // #region path builders
    buildEnvPath(path: string, env = null) {
        env = env || this.getEnv();
        const fullPath = [];
        fullPath.push(env);
        if (path) fullPath.push(path);

        return fullPath.join('/');
    }

    buildRootDir(transactionUid = '') {
        const _transactionUid = transactionUid || this.transactionUid;
        const rootPath = [];
        // bucket can be switched just by creating another one
        // const envPath = this.getStorageEnv();
        // if (envPath) rootPath.push(envPath);

        rootPath.push(this.projectPath);
        rootPath.push(_transactionUid);

        return rootPath.join('/');
    }

    buildStageDir(stageUidAndExecutionUid: string, rootPath = '') {
        const { stageUid } = this.separateStageUidAndExecutionUid(stageUidAndExecutionUid);

        const stageDir = [rootPath || this.transactionPath, stageUid];
        return stageDir.join('/');
    }

    buildExecutionDir(stageUidAndExecutionUid: string, executionUid_ = '', rootPath = '') {
        const { stageUid, executionUid } = this.separateStageUidAndExecutionUid(stageUidAndExecutionUid);
        if (!executionUid_ && executionUid) {
            executionUid_ = executionUid;
        }

        const executionDir = [this.buildStageDir(stageUid, rootPath)];
        if (executionUid_) executionDir.push(executionUid_);
        return executionDir.join('/');
    }

    buildExecutionDirWithCurrentExecutionUid(stageUid: string, rootPath = '') {
        return this.buildExecutionDir(stageUid, this.executionUid, rootPath);
    }
    // #endregion
}

export interface PathMixin extends StageStructureProperties, DateMixin {}
