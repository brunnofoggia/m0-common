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

    // getters
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
}

export interface PathMixin extends StageStructureProperties {}
