import { uniqueId as _uniqueId } from 'lodash';

export function processUniqueId(prefix = 'worker'): string {
    const date = new Date().toISOString().replace(/[-:.]/g, '');
    return [_uniqueId(`${prefix}:`), date].join(':');
}
