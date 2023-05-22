import _debug from 'debug';
const debug = _debug('worker:stage:handler');

import { throwHttpException } from 'node_common/dist/utils/errors';
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
            return fileClass;
        } catch (error) {
            if (error.message.indexOf('Unable to compile') < 0) {
                debug('stage handler not found', filePath);
                if (defaultHandler && handler != defaultHandler) {
                    return await this.get(basePath, '', defaultHandler);
                }
            }
            throw error;
        }
    }
};

export { importWorker, setImportFn };
export default importWorker;
