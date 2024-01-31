import { BodyInterface } from './body.interface';
import { ModuleConfigInterface } from './moduleConfig.interface';
import { StageConfigInterface } from './stageConfig.interface';
import { StageExecutionInterface } from './stageExecution.interface';
import { ProjectInterface } from './project.interface';

export interface StageExtractProperties {
    body: BodyInterface;
    transactionUid: string;
    moduleConfig: ModuleConfigInterface;
    stageConfig: StageConfigInterface;
    stageExecution: StageExecutionInterface;
    project: ProjectInterface;
    rootDir: string;
    stageDir: string;
}

export interface StageExtractMethods {
    // options
    isStageOptionActivated: (...args: any[]) => boolean;
    isStageOptionDeactivated: (...args: any[]) => boolean;
    isModuleOptionActivated: (...args: any[]) => boolean;
    isModuleOptionDeactivated: (...args: any[]) => boolean;
    isInheritedOptionActivated: (...args: any[]) => boolean;
    isInheritedOptionDeactivated: (...args: any[]) => boolean;
    // service
    getService: any;
    // secrets
    getGlobalSecret: any;
    getModuleSecret: any;
    getStageSecret: any;
    // date
    getDate: any;
    getTimezoneString: any;
    getTimezoneOffset: any;
    // trace
    logError: any;
    getExecutionInfo: any;
    getExecutionInfoValue: any;
    setExecutionInfoValue: any;
    increaseExecutionInfoValue: any;
    getRetryAttempt: any;
    getRetryLimit: any;
}

export interface StageParts extends StageExtractProperties, StageExtractMethods {}
