import _debug from 'debug';
const essentialInfo = _debug('worker:stage:essential');

export function m0RequestLog(...args) {
    essentialInfo('m0apifailure', ...args);
}

export function m0RequestErrorHandler(error: any, data = null, shouldThrow = true) {
    m0RequestLog('error', `status: ${error.code}`, `message: ${error.message}`);
    if (error.status) {
        const _path = (error.request?.path || '').split('/').slice(0, 4).join('/');
        m0RequestLog('details');

        console.log(
            `host: ${error.request?.protocol}//${error.request?.host}:${error.request?.port || '80'}\n`,
            `basepath: ${_path}\n`,
            `fullpath: ${error.request?.path}\n`,
            `method: ${error.request?.method}\n`,
            `status: ${error.status}\n`,
            `message: ${error.message}`,
        );
        if (data) m0RequestLog('data', data);

        const status = +error.status;
        if (status >= 500) error.ack = false;
    }

    if (shouldThrow) throw error;
}
