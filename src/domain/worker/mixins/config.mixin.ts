import { isNumber, isString, size } from 'lodash';

export class ConfigMixin {
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

        return (isNumber(value) && value > 0) || value === true || (size(value) > 0 && !this._isDeactivated(configHolder, configName, configKey));
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
    public _isStageConfigActivated(configName, stageConfig) {
        return this._isActivated(stageConfig, configName);
    }

    public _isStageConfigDeactivated(configName, stageConfig) {
        return this._isDeactivated(stageConfig, configName);
    }

    public _isModuleConfigActivated(configName, moduleConfig) {
        return this._isActivated(moduleConfig, configName);
    }

    public _isModuleConfigDeactivated(configName, moduleConfig) {
        return this._isDeactivated(moduleConfig, configName);
    }

    public _isProjectConfigActivated(configName, project) {
        return this._isActivated(project, configName, '_config');
    }

    public _isProjectConfigDeactivated(configName, project) {
        return this._isDeactivated(project, configName, '_config');
    }

    public _isModuleStageConfigActivated(configName, moduleConfig, stageConfig) {
        return this._isActivated(stageConfig, configName) || this._isActivated(moduleConfig, configName);
    }

    public _getModuleStageConfigActivated(configName, moduleConfig, stageConfig) {
        return this._getActivatedConfig(stageConfig, configName) || this._getActivatedConfig(moduleConfig, configName);
    }

    public _isModuleStageConfigDeactivated(configName, moduleConfig, stageConfig) {
        return this._isDeactivated(stageConfig, configName) || this._isDeactivated(moduleConfig, configName);
    }

    public _isInheritedConfigActivated(configName, moduleConfig, stageConfig, project) {
        return (
            this._isActivated(stageConfig, configName) ||
            this._isActivated(moduleConfig, configName) ||
            this._isActivated(project, configName, '_config')
        );
    }

    public _getInheritedConfigActivated(configName, moduleConfig, stageConfig, project) {
        return (
            this._getActivatedConfig(stageConfig, configName) ||
            this._getActivatedConfig(moduleConfig, configName) ||
            this._getActivatedConfig(project, configName, '_config')
        );
    }

    public _isInheritedConfigDeactivated(configName, moduleConfig, stageConfig, project) {
        return (
            this._isDeactivated(stageConfig, configName) ||
            this._isDeactivated(moduleConfig, configName) ||
            this._isDeactivated(project, configName, '_config')
        );
    }
}
