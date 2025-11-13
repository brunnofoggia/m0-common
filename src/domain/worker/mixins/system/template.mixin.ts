import _debug from 'debug';
const debug = _debug('worker:mixin:template');
import { isArray, isObject, isString, template } from 'lodash';

import { PathMixin } from './path.mixin';
import { DateMixin } from './date.mixin';
import dayjs from 'dayjs';

export interface renderOptions {
    // configs
    config: any;
    options: any;
    stageConfig: any;
    moduleConfig: any;
    projectConfig: any;
    project: any;
    // execution
    moduleExecution: any;
    stageExecution: any;
    // other data
    date: dayjs.Dayjs;
    env: string;
    transactionUid: string;
    executionUid: string;
    projectUid: string;
    worker: any;
}

export abstract class TemplateMixin {
    isTemplateExpression(text: string): boolean {
        return isString(text) && text.includes('<%=');
    }

    isTemplateRenderedTruthy(text) {
        const _text = (text + '').trim();
        return _text === 'true' || _text === '1';
    }

    compileTemplates(data: any) {
        if (isString(data)) {
            try {
                return template(data);
            } catch (error) {
                debug(`Error building template for input "${data}":`, error);
                throw new Error(`Invalid template: ${data}`);
            }
        }

        for (const key in data) {
            let value = data[key];
            if (isArray(value) || isObject(value) || isString(value)) value = this.compileTemplates(value);
            data[key] = value;
        }

        return data;
    }

    renderTemplates(data: any, options: renderOptions | any = {}, templateEngine = null): any {
        if (isString(data)) {
            try {
                return this.renderTemplate(data, options, templateEngine);
            } catch (error) {
                debug(`Error building template for input "${data}":`, error);
                throw new Error(`Invalid template: ${data}`);
            }
        }

        for (const key in data) {
            let value = data[key];
            if (isArray(value) || isObject(value) || isString(value)) {
                value = this.renderTemplates(value, options, templateEngine);
            }
            data[key] = value;
        }

        return data;
    }

    renderTemplate(text, options: renderOptions | any = {}, templateEngine = null): string {
        const _templateEngine = templateEngine || template;
        const _template = isString(text) ? _templateEngine(text) : text;

        const _options = {
            ...options,
            ...this.getAllPaths(),
            // configs
            config: this.stageConfig.config,
            options: this.stageConfig.options,
            stageConfig: this.stageConfig,
            moduleConfig: this.moduleConfig,
            projectConfig: this.project,
            project: this.project,
            // execution
            moduleExecution: this.moduleExecution,
            stageExecution: this.stageExecution,
            // other data
            date: this.getDate(),
            env: this.getStorageEnv(),
            transactionUid: this.transactionUid,
            executionUid: this.executionUid,
            projectUid: this.getProjectUid(),
            worker: this,
        };
        return _template(_options);
    }
}

export interface TemplateMixin extends PathMixin, DateMixin {}
