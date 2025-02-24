import { StageUidAndExecutionUid } from '../../../../interfaces/stageExecution.interface';
import { StageStructureProperties } from '../../../../interfaces/stageParts.interface';

export interface PathProperties {
    rootDir: string;
    moduleDir: string;
    stageDir: string;
    executionDir: string;
    projectSharedDir: string;

    projectPath: string;
    projectModulePath: string;
    projectStagePath: string;

    sharedPath: string;
    sharedModulePath: string;
    sharedStagePath: string;
}

export abstract class PathMixin {
    abstract getProjectUid(): string;
    abstract getEnv(): string;
    abstract getFakeEnv(): string;
    abstract separateStageUidAndExecutionUid(stageUidAndExecUid: string): StageUidAndExecutionUid;

    rootDir: string;
    moduleDir: string;
    stageDir: string;
    executionDir: string;

    internalPath: string;
    projectPath: string;
    projectModulePath: string;
    projectStagePath: string;
    projectSharedPath: string;

    sharedPath: string;
    sharedModulePath: string;
    sharedStagePath: string;

    getStorageEnv() {
        return process.env.STORAGE_ENV || this.getFakeEnv();
    }

    setPaths() {
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
        this.rootDir = this.buildRootDir();
    }

    setPathModule() {
        this.moduleDir = [this.rootDir, this.moduleConfig.moduleUid].join('/');
        this.projectModulePath = [this.projectPath, this.moduleUid].join('/');
    }

    setPathStage() {
        const stageDir = [this.rootDir, this.stageConfig.stageUid];
        this.stageDir = stageDir.join('/');

        if (this.executionUid) stageDir.push(this.executionUid);
        this.executionDir = stageDir.join('/');

        this.projectStagePath = [this.projectPath, this.stageUid].join('/');
    }

    buildRootDir(transactionUid = '') {
        const _transactionUid = transactionUid || this.transactionUid;
        const rootDir = [];
        // bucket can be switched just by creating another one
        // const envPath = this.getStorageEnv();
        // if (envPath) rootDir.push(envPath);

        rootDir.push(this.projectPath);
        rootDir.push(_transactionUid);

        return rootDir.join('/');
    }

    setProjectSharedPath() {
        const projectSharedDir = [];
        projectSharedDir.push(this.projectPath);
        projectSharedDir.push('shared');

        this.projectSharedPath = projectSharedDir.join('/');
    }

    setSharedPath() {
        const sharedDir = [];
        sharedDir.push('shared');

        this.sharedPath = sharedDir.join('/');
    }

    setSharedModulePath() {
        const sharedModuleDir = [];
        sharedModuleDir.push(this.sharedPath);
        sharedModuleDir.push(this.moduleConfig.moduleUid);

        this.sharedModulePath = sharedModuleDir.join('/');
    }

    setSharedStagePath() {
        const sharedStageDir = [];
        sharedStageDir.push(this.sharedPath);
        sharedStageDir.push(this.stageConfig.stageUid);

        this.sharedStagePath = sharedStageDir.join('/');
    }

    // buildExecutionDir(stageUid: string, executionUid: string) {
    //     const stageDir = [this.rootDir, stageUid];
    //     if (executionUid) stageDir.push(executionUid);
    //     return stageDir.join('/');

    // }

    buildStageDir(stageUidAndExecutionUid: string, rootDir = '') {
        const { stageUid } = this.separateStageUidAndExecutionUid(stageUidAndExecutionUid);

        const stageDir = [rootDir || this.rootDir, stageUid];
        return stageDir.join('/');
    }

    buildExecutionDir(stageUidAndExecutionUid: string, executionUid_ = '', rootDir = '') {
        const { stageUid, executionUid } = this.separateStageUidAndExecutionUid(stageUidAndExecutionUid);
        if (!executionUid_ && executionUid) {
            executionUid_ = executionUid;
        }

        const executionDir = [this.buildStageDir(stageUid, rootDir)];
        if (executionUid_) executionDir.push(executionUid_);
        return executionDir.join('/');
    }

    buildExecutionDirWithCurrentExecutionUid(stageUid: string, rootDir = '') {
        return this.buildExecutionDir(stageUid, this.executionUid, rootDir);
    }

    // #region getters
    getRootDir() {
        return this.rootDir;
    }

    getModuleDir() {
        return this.moduleDir;
    }

    getStageDir() {
        return this.stageDir;
    }

    getExecutionDir() {
        return this.executionDir;
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
            rootDir: this.rootDir,
            moduleDir: this.moduleDir,
            stageDir: this.stageDir,
            executionDir: this.executionDir,
            projectPath: this.projectPath,
            projectModulePath: this.projectModulePath,
            projectStagePath: this.projectStagePath,
            projectSharedDir: this.projectSharedPath,
            sharedPath: this.sharedPath,
            sharedModulePath: this.sharedModulePath,
            sharedStagePath: this.sharedStagePath,
        };
    }
    // #endregion
}

export interface PathMixin extends StageStructureProperties {}
