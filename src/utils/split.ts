import _debug from 'debug';
const debug = _debug('app:util:split');

import { sleep } from 'node_common/dist/utils';

const copyContent = function (content) {
    let copy: any;
    if (typeof content === 'string') {
        copy = content + '';
    } else {
        copy = [...content];
    }
    return copy;
};

const partsFinished = async (options, timer = 0) => {
    // TODO: implementar timer para nao aguardar eternamente
    if (options.ordered !== options.finished) {
        const sleepTime = 500;
        await sleep(sleepTime);
        return await partsFinished(options, timer - sleepTime);
    }
};

const defineBulkLimit = async (createFileStream, options) => {
    if (options._forceBulkLimit) return options._forceBulkLimit;
    const fileStream = await createFileStream();
    if (options.lengthLimit) {
        let lineCount = 0;
        for await (const line of fileStream) {
            lineCount++;
        }

        const bulkLimit = Math.ceil(lineCount / +options.lengthLimit);

        // lengthLimit is the number of processes that can be ran, so
        // bulkLimit must cover all the rows under that number of processes
        return bulkLimit > +options.bulkLimit ? bulkLimit : +options.bulkLimit;
    }
    return +options.bulkLimit;
};

export const splitFile = async function (createFileStream, options, splitContent: any = '', formatLineFn, bulkFn) {
    const bulkLimit = await defineBulkLimit(createFileStream, options);
    const fileStream = await createFileStream();
    (formatLineFn === null) && (formatLineFn = (s) => s);
    const bulkPart = async (splitNumber, sendContent, parts) => {
        parts.ordered++;
        await bulkFn(splitNumber, sendContent, parts);
    };

    let lineNumber = 0;
    let splitNumber = 0;

    let lineCount = 0;
    const parts = { ordered: 0, finished: 0 };

    for await (const line of fileStream) {
        const lineResult = formatLineFn(line, lineNumber, lineCount, splitNumber, bulkLimit);

        // debug('bulkPart', lineCount, bulkLimit);
        if (+bulkLimit > 0 && lineCount == bulkLimit) {
            await bulkPart(splitNumber, copyContent(splitContent), parts);
            lineCount = 0;
            splitContent = typeof splitContent === 'string' ? '' : [];
            splitNumber++;
        }

        if (lineResult !== null) { // skip null values returned by formatLineFn
            typeof splitContent === 'string' ?
                (splitContent += lineResult + '\n') :
                (splitContent.push(lineResult));

            lineCount++;
        }
        lineNumber++;
    }

    if (lineCount > 0) {
        await bulkPart(splitNumber, copyContent(splitContent), parts);
    }

    await partsFinished(parts);
};
