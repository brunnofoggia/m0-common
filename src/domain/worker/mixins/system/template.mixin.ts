import { isString, template } from 'lodash';

import { PathMixin } from './path.mixin';
import { DateMixin } from './date.mixin';
import dayjs from 'dayjs';

export interface renderOptions {
    config: any;
    options: any;
    stageConfig: any;
    moduleConfig: any;
    projectConfig: any;
    project: any;
    moduleExecution: any;
    stageExecution: any;
    date: dayjs.Dayjs;
    env: string;
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

    renderTemplate(text, options: renderOptions | any = {}, templateEngine = null): string {
        const _templateEngine = templateEngine || template;
        const _template = _templateEngine(text);

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
            worker: this,
        };
        return _template(_options);
    }
}

export interface TemplateMixin extends PathMixin, DateMixin {}
