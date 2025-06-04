import _debug from 'debug';
const debug = _debug('worker:stage:importer');

let _import;
const setImportFn = (_fn) => {
    _import = _fn;
};

const importWorker = async (basePath, name, handler = '', defaultHandler = 'index'): Promise<{ _class: any; found: boolean }> => {
    const path = [basePath];

    if (!handler) handler = 'index';
    const stagePath = [...path];
    name && stagePath.push(name);
    const filePath = [...stagePath, handler].join('/');

    try {
        const fileClass = (await _import(filePath)).default;
        if (handler != defaultHandler) debug('import worker found builder at', filePath);
        return { _class: fileClass, found: true };
    } catch (error) {
        const errorFirstLine = (error.message || '').split('\n')[0];
        const fileLocation = [...stagePath, handler].join('/');
        if (errorFirstLine.indexOf('Cannot find module') >= 0 && errorFirstLine.indexOf(fileLocation) > 0) {
            debug('import worker could not find builder at', filePath);
            if (defaultHandler && handler != defaultHandler) {
                debug('import worker will load default instead', defaultHandler);
                const { _class } = await importWorker(basePath, name, defaultHandler);
                return { _class, found: false };
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
    // const filePath = [...stagePath, handler].join('/');

    return (await importFileMixin(stagePath, handler)).default;
    // return (await _import(filePath)).default;
};

const importFileMixin = async (basePath, name): Promise<any> => {
    const path = [basePath];

    const finalPath = [...path];
    name && finalPath.push(name);
    const filePath = finalPath.join('/');

    return await _import(filePath);
};

export { importWorker, importMixin, setImportFn, importFileMixin };
