import { get } from 'lodash';
import { RequiredListInterface } from '../interfaces/validate';

export const validateOptionsByRuleSet = (object: { [key: string]: any }, requiredList: RequiredListInterface): any => {
    if (requiredList)
        for (const required of requiredList) {
            validateOptions(object, required.pathList, required.basePath);
        }
};

export const validateOptions = (object: { [key: string]: any }, pathList: string[], basePath_ = ''): any => {
    const basePath = basePath_ || 'stageConfig.options';
    const { result, errors } = verifyOptions(object, pathList, basePath);
    if (!result) {
        throw new Error(`Options not found (at "${basePath}"): ${errors.join(', ')}`);
    }
};

export const verifyOptions = (object_: { [key: string]: any }, pathList: string[], basePath = ''): any => {
    const errors = [];
    const object = basePath ? get(object_, basePath) : object_;

    for (const path of pathList) {
        const value = get(object, path);
        if (!checkOptionValue(value)) {
            errors.push(path);
        }
    }

    return { result: errors.length === 0, errors };
};

export const checkOptionValue = (value: any) => {
    return value !== undefined;
};
