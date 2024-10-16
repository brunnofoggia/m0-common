import { uniqueId as _uniqueId } from 'lodash';

export function processUniqueId() {
    return [_uniqueId('worker:'), new Date().toISOString()].join(':');
}
