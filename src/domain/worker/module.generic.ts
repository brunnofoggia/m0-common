import { uniqueId } from 'lodash';
import { exitRequest } from 'node-common/dist/utils/errors';

export abstract class ModuleGeneric {
    protected uniqueId: string;

    checkBodyStageUid(body) {
        if (!body.stageUid) exitRequest('stageUid not found into message body');
    }

    checkBodyTransaction(body) {
        if (!body.transactionUid) exitRequest('transactionUid must be specified into message body');
    }

    checkBodyProjectOrTransaction(body) {
        if (!body.transactionUid && !body.projectUid) exitRequest('transactionUid or projectUid must be specified into message body');
    }

    protected abstract checkBody(body);

    protected setUniqueId(_uniqueId = '') {
        !_uniqueId && (_uniqueId = [uniqueId('worker:'), new Date().toISOString()].join(':'));
        return (this.uniqueId = _uniqueId);
    }
}
