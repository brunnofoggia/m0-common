import { isNumber, isString, size } from 'lodash';

export abstract class ConfigMixin {
    _getConfigHolder(configHolder) {
        return isString(configHolder) ? this[configHolder] : configHolder;
    }

    _getConfigValue(configHolder, configName, configKey = 'config') {
        const holder = this._getConfigHolder(configHolder) || {};
        const config = holder[configKey] || {};
        return config[configName] || undefined;
    }

    _isActivated(configHolder, configName, configKey = 'config') {
        const value = this._getConfigValue(configHolder, configName, configKey);

        return (
            (isNumber(value) && value > 0) ||
            value === true ||
            (size(value) > 0 && !this._isDeactivated(configHolder, configName, configKey))
        );
    }

    _getActivatedConfig(configHolder, configName, configKey = 'config') {
        if (this._isActivated(configHolder, configName, configKey)) {
            return this._getConfigValue(configHolder, configName, configKey);
        }
    }

    _isDeactivated(configHolder, configName, configKey = 'config') {
        const value = this._getConfigValue(configHolder, configName, configKey);
        return value === 0 || value === false;
    }

    _isStageConfigActivated(configName, stageConfig) {
        return this._isActivated(stageConfig, configName);
    }

    _isStageConfigDeactivated(configName, stageConfig) {
        return this._isDeactivated(stageConfig, configName);
    }

    _isModuleConfigActivated(configName, moduleConfig) {
        return this._isActivated(moduleConfig, configName);
    }

    _isModuleConfigDeactivated(configName, moduleConfig) {
        return this._isDeactivated(moduleConfig, configName);
    }

    _isProjectConfigActivated(configName, project) {
        return this._isActivated(project, configName, '_config');
    }

    _isProjectConfigDeactivated(configName, project) {
        return this._isDeactivated(project, configName, '_config');
    }

    _isModuleStageConfigActivated(configName, moduleConfig, stageConfig) {
        return this._isActivated(stageConfig, configName) || this._isActivated(moduleConfig, configName);
    }

    _getModuleStageConfigActivated(configName, moduleConfig, stageConfig) {
        return this._getActivatedConfig(stageConfig, configName) || this._getActivatedConfig(moduleConfig, configName);
    }

    _isModuleStageConfigDeactivated(configName, moduleConfig, stageConfig) {
        return this._isDeactivated(stageConfig, configName) || this._isDeactivated(moduleConfig, configName);
    }

    _isInheritedConfigActivated(configName, moduleConfig, stageConfig, project) {
        return (
            this._isActivated(stageConfig, configName) ||
            this._isActivated(moduleConfig, configName) ||
            this._isActivated(project, configName, '_config')
        );
    }

    _getInheritedConfigActivated(configName, moduleConfig, stageConfig, project) {
        return (
            this._getActivatedConfig(stageConfig, configName) ||
            this._getActivatedConfig(moduleConfig, configName) ||
            this._getActivatedConfig(project, configName, '_config')
        );
    }

    _isInheritedConfigDeactivated(configName, moduleConfig, stageConfig, project) {
        return (
            this._isDeactivated(stageConfig, configName) ||
            this._isDeactivated(moduleConfig, configName) ||
            this._isDeactivated(project, configName, '_config')
        );
    }
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

    isInheritedOptionActivated(configName) {
        return this._isActivated('stageConfig', configName, 'options') || this._isActivated('moduleConfig', configName, 'options');
    }

    isInheritedOptionDeactivated(configName) {
        return this._isDeactivated('stageConfig', configName, 'options') || this._isDeactivated('moduleConfig', configName, 'options');
    }
}
