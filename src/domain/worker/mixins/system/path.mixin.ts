import { StageUidAndExecutionUid } from '../../../../interfaces/stageExecution.interface';
import { StageStructureProperties } from '../../../../interfaces/stageParts.interface';

export interface PathProperties {
    rootDir: string;
    moduleDir: string;
    stageDir: string;
    executionDir: string;

    projectPath: string;
    projectModulePath: string;
    projectStagePath: string;
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

    projectPath: string;
    projectModulePath: string;
    projectStagePath: string;

    getStorageEnv() {
        return process.env.STORAGE_ENV;
    }

    setPaths() {
        this.setPathRoot();
        this.setPathModule();
        this.setPathStage();
    }

    setPathRoot() {
        const rootDir = [];
        // bucket can be switched just by creating another one
        // const envPath = this.getStorageEnv();
        // if (envPath) rootDir.push(envPath);

        this.projectPath = this.getProjectUid();
        rootDir.push(this.projectPath);
        rootDir.push(this.transactionUid);

        this.rootDir = rootDir.join('/');
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

    // buildExecutionDir(stageUid: string, executionUid: string) {
    //     const stageDir = [this.rootDir, stageUid];
    //     if (executionUid) stageDir.push(executionUid);
    //     return stageDir.join('/');

    // }

    buildExecutionDir(stageUidAndExecutionUid: string, executionUid_ = '') {
        const { stageUid, executionUid } = this.separateStageUidAndExecutionUid(stageUidAndExecutionUid);
        if (!executionUid_ && executionUid) {
            executionUid_ = executionUid;
        }

        const executionDir = [this.rootDir, stageUid];
        if (executionUid_) executionDir.push(executionUid_);
        return executionDir.join('/');
    }

    buildExecutionDirWithCurrentExecutionUid(stageUid: string) {
        return this.buildExecutionDir(stageUid, this.executionUid);
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

    getAllPaths() {
        return {
            rootDir: this.rootDir,
            moduleDir: this.moduleDir,
            stageDir: this.stageDir,
            executionDir: this.executionDir,
            projectPath: this.projectPath,
            projectModulePath: this.projectModulePath,
            projectStagePath: this.projectStagePath,
        };
    }
    // #endregion
}

export interface PathMixin extends StageStructureProperties {}
