import _debug from 'debug';
const debug = _debug('worker:util:split');

import { sleep } from 'node-labs/lib/utils';

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
    formatLineFn === null && (formatLineFn = (s) => s);
    const bulkPart = async (splitNumber, sendContent, parts) => {
        parts.ordered++;
        await bulkFn(splitNumber, sendContent, parts);
    };

    let lineNumber = 0;
    let splitNumber = 0;

    let lineInsertedCount = 0;
    const parts = { ordered: 0, finished: 0 };

    for await (const line of fileStream) {
        // debug('bulkPart', lineCount, bulkLimit);
        if (+bulkLimit > 0 && lineInsertedCount == bulkLimit) {
            await bulkPart(splitNumber, copyContent(splitContent), parts);
            lineInsertedCount = 0;
            splitContent = typeof splitContent === 'string' ? '' : [];
            splitNumber++;
        }

        const lineResult = await formatLineFn(line, lineNumber, lineInsertedCount, splitNumber, bulkLimit);
        if (lineResult !== null) {
            // skip null values returned by formatLineFn

            if (lineResult !== false) {
                // skip false values but increase line inserted count
                // used to write stream out of here
                const breakLine = !lineInsertedCount ? '' : '\n';
                typeof splitContent === 'string' ? (splitContent += breakLine + lineResult) : splitContent.push(lineResult);
            }
            lineInsertedCount++;
        }
        lineNumber++;
    }

    if (lineInsertedCount > 0) {
        await bulkPart(splitNumber, copyContent(splitContent), parts);
    }

    await partsFinished(parts);
};
