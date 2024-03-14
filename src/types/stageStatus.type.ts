export enum StageStatusEnum {
    INITIAL = 'I',
    WAITING = 'W',
    ASYNC = 'A',
    PROCESS = 'P',
    DONE = 'D',
    // ERRORS SHOULD BE EXECUTED AGAIN
    ERROR = 'E',
    // EXPECTED FAILS SHOULD NOT BE EXECUTED AGAIN
    FAILED = 'F',
    // UNEXPECTED FAILS SHOULD NOT BE EXECUTED AGAIN
    UNKNOWN = 'U',
}

export const StageStatusProcess = [StageStatusEnum.INITIAL, StageStatusEnum.WAITING, StageStatusEnum.PROCESS, StageStatusEnum.ASYNC];
export const StageStatusError = [StageStatusEnum.ERROR, StageStatusEnum.FAILED, StageStatusEnum.UNKNOWN];
export const StageStatusEnded = [StageStatusEnum.DONE, StageStatusEnum.FAILED, StageStatusEnum.UNKNOWN];
