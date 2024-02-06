import { BodyInterface } from './body.interface';
import { ModuleConfigInterface } from './moduleConfig.interface';
import { StageConfigInterface } from './stageConfig.interface';
import { StageExecutionInterface } from './stageExecution.interface';
import { ProjectInterface } from './project.interface';
import { ModuleExecutionInterface } from './moduleExecution.interface';
import { PathProperties } from 'domain/worker/mixins/system/path.mixin';

export interface ModuleStructureProperties {
    body: BodyInterface;

    transactionUid: string;
    moduleUid: string;
    stageUid: string;
    executionUid: string;
    stageName: string;

    moduleConfig: ModuleConfigInterface;
    stageConfig: StageConfigInterface;
    project: ProjectInterface;
}

export interface StageStructureProperties extends ModuleStructureProperties {
    moduleExecution: ModuleExecutionInterface;
    stageExecution: StageExecutionInterface;
}

export interface StageAllProperties extends StageStructureProperties, PathProperties {}

export interface StageFeatureMethods {
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

export interface StageParts extends StageAllProperties, StageFeatureMethods {}
