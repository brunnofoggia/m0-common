import _debug from 'debug';
const debug = _debug('worker:stage:handler:importWorker');

import { throwHttpException } from 'node-common/dist/utils/errors';
import { ERROR } from '../../types/error.type';

let _import;
const setImportFn = (_fn) => {
    _import = _fn;
};

const importWorker = {
    async get(basePath, name, handler = '', defaultHandler = 'worker'): Promise<any> {
        // BaseEmissorSplit;
        const path = [basePath];

        if (!handler) handler = 'index';
        const stagePath = [...path];
        name && stagePath.push(name);
        const filePath = [...stagePath, handler].join('/');

        try {
            const fileClass = (await _import(filePath)).default;
            return { _class: fileClass, found: true };
        } catch (error) {
            const errorFirstLine = (error.message || '').split('\n')[0];
            const fileLocation = [...stagePath, handler].join('/');
            if (errorFirstLine.indexOf('Cannot find module') >= 0 && errorFirstLine.indexOf(fileLocation) > 0) {
                debug('*** stage handler not found ***', filePath);
                if (defaultHandler && handler != defaultHandler) {
                    return { ...(await this.get(basePath, '', defaultHandler)), found: false };
                }
            }
            throw error;
        }
    },
};

export { importWorker, setImportFn };
export default importWorker;
