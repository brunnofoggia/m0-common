import _debug from 'debug';
const debug = _debug('worker:stage:importers');

let _import;
const setImportFn = (_fn) => {
    _import = _fn;
};

const importWorker = async (basePath, name, handler = '', defaultHandler = 'worker'): Promise<any> => {
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
            debug('*** import worker could not find ***', filePath);
            if (defaultHandler && handler != defaultHandler) {
                return { ...(await importWorker(basePath, '', defaultHandler)), found: false };
            }
        }
        throw error;
    }
};

const importMixin = async (basePath, name, handler = ''): Promise<any> => {
    const path = [basePath];

    if (!handler) handler = 'index';
    const stagePath = [...path];
    name && stagePath.push(name);
    const filePath = [...stagePath, handler].join('/');

    return (await _import(filePath)).default;
};

export { importWorker, importMixin, setImportFn };
