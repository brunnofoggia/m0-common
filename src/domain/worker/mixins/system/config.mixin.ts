import { cloneDeep, defaultsDeep, isNumber, isString, size } from 'lodash';

import { StageStructureProperties } from '../../../../interfaces/stageParts.interface';

export abstract class ConfigMixin {
    // unaltered options and config from database
    // declare _stageConfig_options: any;
    // declare _stageConfig_config: any;
    // stash of mixed options received along initialization process (stage options, domain options and custom options that maybe inserted along some process)
    // necessary to avoid losing inputed options during domain loading
    // declare _stageConfig_options_inputed: any;
    // declare _stageConfig_config_inputed: any;

    // #region core validation
    _checkValueIsActivated(value) {
        return (isNumber(value) && value > 0) || value === true || (size(value) > 0 && !this._checkValueIsDeactivated(value));
    }

    _checkValueIsDeactivated(value) {
        return value === 0 || value === false;
    }
    // #endregion

    // #region config getters
    _getConfigHolder(configHolder) {
        return isString(configHolder) ? this[configHolder] : configHolder;
    }

    _getConfigValue(configHolder, configName, configKey = 'config') {
        const holder = this._getConfigHolder(configHolder) || {};
        const config = holder[configKey] || {};
        return config[configName] || undefined;
    }
    // #endregion

    // #region common getters and validators
    _isActivated(configHolder, configName, configKey = 'config') {
        const value = this._getConfigValue(configHolder, configName, configKey);

        return this._checkValueIsActivated(value);
    }

    _getActivatedConfig(configHolder, configName, configKey = 'config') {
        if (this._isActivated(configHolder, configName, configKey)) {
            return this._getConfigValue(configHolder, configName, configKey);
        }
    }

    _isDeactivated(configHolder, configName, configKey = 'config') {
        const value = this._getConfigValue(configHolder, configName, configKey);
        return this._checkValueIsDeactivated(value);
    }
    // #endregion

    // #region base activated config checkers
    // _isStageConfigActivated(configName, stageConfig) {
    //     return this._isActivated(stageConfig, configName);
    // }

    // _isStageConfigDeactivated(configName, stageConfig) {
    //     return this._isDeactivated(stageConfig, configName);
    // }

    // _isModuleConfigActivated(configName, moduleConfig) {
    //     return this._isActivated(moduleConfig, configName);
    // }

    // _isModuleConfigDeactivated(configName, moduleConfig) {
    //     return this._isDeactivated(moduleConfig, configName);
    // }

    // _isProjectConfigActivated(configName, project) {
    //     return this._isActivated(project, configName, '_config');
    // }

    // _isProjectConfigDeactivated(configName, project) {
    //     return this._isDeactivated(project, configName, '_config');
    // }

    // _isModuleStageConfigActivated(configName, moduleConfig, stageConfig) {
    //     return this._isActivated(stageConfig, configName) || this._isActivated(moduleConfig, configName);
    // }

    // _getModuleStageConfigActivated(configName, moduleConfig, stageConfig) {
    //     return this._getActivatedConfig(stageConfig, configName) || this._getActivatedConfig(moduleConfig, configName);
    // }

    // _isModuleStageConfigDeactivated(configName, moduleConfig, stageConfig) {
    //     return this._isDeactivated(stageConfig, configName) || this._isDeactivated(moduleConfig, configName);
    // }
    // #endregion

    // #region base inherited config activated checkers
    // _isInheritedConfigActivated(configName, moduleConfig, stageConfig, project) {
    //     return (
    //         this._isActivated(stageConfig, configName) ||
    //         this._isActivated(moduleConfig, configName) ||
    //         this._isActivated(project, configName, '_config')
    //     );
    // }

    // _getInheritedConfigActivated(configName, moduleConfig, stageConfig, project) {
    //     return (
    //         this._getActivatedConfig(stageConfig, configName) ||
    //         this._getActivatedConfig(moduleConfig, configName) ||
    //         this._getActivatedConfig(project, configName, '_config')
    //     );
    // }

    // _isInheritedConfigDeactivated(configName, moduleConfig, stageConfig, project) {
    //     return (
    //         this._isDeactivated(stageConfig, configName) ||
    //         this._isDeactivated(moduleConfig, configName) ||
    //         this._isDeactivated(project, configName, '_config')
    //     );
    // }
    // #endregion

    // #region activated config checkers
    isStageConfigActivated(configName) {
        return this._isActivated('stageConfig', configName);
    }

    isStageConfigDeactivated(configName) {
        return this._isDeactivated('stageConfig', configName);
    }

    isModuleConfigActivated(configName) {
        return this._isActivated('moduleConfig', configName);
    }

    isModuleConfigDeactivated(configName) {
        return this._isDeactivated('moduleConfig', configName);
    }

    isProjectConfigActivated(configName) {
        return this._isActivated('project', configName, '_config');
    }

    isProjectConfigDeactivated(configName) {
        return this._isDeactivated('project', configName, '_config');
    }

    isModuleStageConfigActivated(configName) {
        return this._isActivated('stageConfig', configName) || this._isActivated('moduleConfig', configName);
    }

    isModuleStageConfigDeactivated(configName) {
        return this._isDeactivated('stageConfig', configName) || this._isDeactivated('moduleConfig', configName);
    }
    // #endregion

    // #region activated option checkers
    isStageOptionActivated(configName) {
        return this._isActivated('stageConfig', configName, 'options');
    }

    isStageOptionDeactivated(configName) {
        return this._isDeactivated('stageConfig', configName, 'options');
    }

    isModuleOptionActivated(configName) {
        return this._isActivated('moduleConfig', configName, 'options');
    }

    isModuleOptionDeactivated(configName) {
        return this._isDeactivated('moduleConfig', configName, 'options');
    }
    // #endregion

    // #region inherited config/option value getters
    getInheritedConfigValue(configName: string) {
        return this.getInheritedModuleStageConfigValue(configName) || this._getConfigValue('project', configName, '_config');
    }

    getInheritedModuleStageConfigValue(configName: string) {
        return this._getConfigValue('stageConfig', configName) || this._getConfigValue('moduleConfig', configName);
    }

    getInheritedOptionValue(configName: string) {
        return this.getInheritedModuleStageOptionValue(configName) || this._getConfigValue('project', configName, '_config');
    }

    getInheritedModuleStageOptionValue(configName: string) {
        return this._getConfigValue('stageConfig', configName, 'options') || this._getConfigValue('moduleConfig', configName, 'options');
    }
    // #endregion

    // #region inherited activated config checkers
    isInheritedConfigActivated(configName) {
        return (
            this._isActivated('stageConfig', configName) ||
            this._isActivated('moduleConfig', configName) ||
            this._isActivated('project', configName, '_config')
        );
    }

    isInheritedConfigDeactivated(configName) {
        return (
            this._isDeactivated('stageConfig', configName) ||
            this._isDeactivated('moduleConfig', configName) ||
            this._isDeactivated('project', configName, '_config')
        );
    }

    getInheritedConfigActivated(configName) {
        return (
            this._getActivatedConfig('stageConfig', configName) ||
            this._getActivatedConfig('moduleConfig', configName) ||
            this._getActivatedConfig('project', configName, '_config')
        );
    }
    // #endregion

    // #region inherited activated option checkers
    isInheritedOptionActivated(configName) {
        return this._isActivated('stageConfig', configName, 'options') || this._isActivated('moduleConfig', configName, 'options');
    }

    isInheritedOptionDeactivated(configName) {
        return this._isDeactivated('stageConfig', configName, 'options') || this._isDeactivated('moduleConfig', configName, 'options');
    }
    // #endregion

    public getDefaultConfig() {
        return this['defaultConfig'] || {};
    }

    public getDefaultOptions() {
        return this['defaultOptions'] || {};
    }

    prepareConfig(_config: any = {}): any {
        if (!this['_stageConfig_config']) this['_stageConfig_config'] = cloneDeep(this.stageConfig.config);
        this['_stageConfig_config_inputed'] = defaultsDeep(this['_stageConfig_config_inputed'], _config);

        this.stageConfig.config = defaultsDeep(
            {},
            this.stageExecution.data.config,
            this['_stageConfig_config'],
            this['_stageConfig_config_inputed'],
            this.getDefaultConfig(),
        );
        return this.stageConfig.config;
    }

    prepareOptions(_options: any = {}): any {
        if (!this['_stageConfig_options']) this['_stageConfig_options'] = cloneDeep(this.stageConfig.options);
        this['_stageConfig_options_inputed'] = defaultsDeep(this['_stageConfig_options_inputed'], _options);

        this.stageConfig.options = defaultsDeep(
            {},
            this.stageExecution.data.options,
            this['_stageConfig_options'],
            this['_stageConfig_options_inputed'],
            this.getDefaultOptions(),
        );
        return this.stageConfig.options;
    }
}

export interface ConfigMixin extends StageStructureProperties {}
