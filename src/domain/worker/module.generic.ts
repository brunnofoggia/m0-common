import { uniqueId } from 'lodash';
import { exitRequest } from 'node-labs/lib/utils/errors';
import { StageGeneric } from './stage.generic';

export abstract class ModuleGeneric {
    static getSolutions;
    protected uniqueId: string;

    static setSolutions(getSolutions) {
        ModuleGeneric.getSolutions = getSolutions;
        StageGeneric.getSolutions = getSolutions;
    }

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
