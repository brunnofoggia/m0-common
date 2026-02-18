import { version as uuidVersion, validate as uuidValidate, v4 as uuidv4 } from 'uuid';

export abstract class MessageMixin {
    abstract _getSolutions();
    abstract worflowEventName: string;

    triggerStageToDefaultProvider(_name: string, body: any): Promise<any> {
        const { events } = this._getSolutions();
        return this._sendEventMessage(_name, body, events);
    }

    async _sendEventMessage(_name, body, events) {
        // events instance is not passed along. why?
        // worker will operate with only one prefix
        // the one that is set into env or the one received inside the body
        const { sendPrefix } = this._processQueuePrefixes(_name, body);
        body.messageUid = this.generateMessageUid();
        return await events.sendToQueue(_name, body, { prefix: sendPrefix });
    }

    generateMessageUid(): string {
        const uuid = uuidv4();
        return uuid;
    }

    // #region queueprefix
    getDefaultPrefix() {
        const { events: defaultEvents } = this._getSolutions();
        return defaultEvents.getPrefix();
    }

    _setBodyQueuePrefix(name, body) {
        const defaultPrefix = this.getDefaultPrefix();
        const workerPrefix = body.queuePrefix || defaultPrefix;
        const m0Prefix = body.m0QueuePrefix || defaultPrefix;

        const isMessageToM0 = this._isMessageToM0(name);
        const diffPrefix = workerPrefix !== m0Prefix;

        delete body.m0QueuePrefix;
        if (!diffPrefix) {
            delete body.queuePrefix;
        } else if (!isMessageToM0) {
            body.queuePrefix = workerPrefix;
            body.m0QueuePrefix = m0Prefix;
        }

        return { body, prefix: workerPrefix, m0Prefix };
    }

    _isMessageToM0(name) {
        return name === this.worflowEventName;
    }

    _processQueuePrefixes(name, body) {
        const { prefix, m0Prefix } = this._setBodyQueuePrefix(name, body);

        let sendPrefix = prefix;
        const isMessageToM0 = this._isMessageToM0(name);
        if (isMessageToM0) {
            sendPrefix = m0Prefix;
        }

        return { sendPrefix, prefix, m0Prefix };
    }
    // #endregion
}
