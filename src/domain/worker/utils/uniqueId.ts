import { uniqueId as _uniqueId } from 'lodash';

export function processUniqueId() {
    const date = new Date().toISOString().replace(/[-:.]/g, '');
    return [_uniqueId('worker:'), date].join(':');
}
