import { defaultsDeep, omit } from 'lodash';
import { DynamicDatabase } from 'node-labs/lib/services/dynamicDatabase.service';

import { MODULE } from '../../../../types/module.type';
import { StageStructureProperties } from '../../../../interfaces/stageParts.interface';
import { importFileMixin } from '../../../../utils/importWorker';
import { StateService } from '../../../../database/m0/mx/services/state.service';
import { MonitorService } from '../../../../database/m0/mx/services/monitor.service';
import { ConnectionDataOptions } from 'domain/worker/interfaces/connection';

export abstract class DatabaseMixin {
    abstract uniqueId: string;
    // abstract project: ProjectInterface;
    abstract getInheritedOptionValue(configName: string): any;
    abstract getSecretsEnv(): string;
    abstract getProjectPath(): string;

    get databaseBaseDirName(): string {
        return 'database';
    }

    get databaseBaseDirPath(): string {
        return `modules/${this.databaseBaseDirName}`;
    }

    get productName(): string {
        return this.getInheritedOptionValue('product') || 'mx';
    }

    get poolId(): string {
        return this.uniqueId;
    }

    getProductName(): string {
        return this.productName;
    }

    getPoolId() {
        return this.poolId;
    }

    // database name is equal to product name
    async connectProductDatabaseByModule(module, _options: Partial<ConnectionDataOptions> = {}) {
        const product = _options.product || this.getProductName();
        const options = defaultsDeep(
            {
                poolId: this.getPoolId(),
                database: product,
                alias: module,
                databaseDir: [product, module].join('/'),
                secretPath: _options.secretPath || this.getDatabaseSecretPath(),
            },
            omit(_options, 'product', 'secretPath'),
        );
        return await DynamicDatabase.setDataSource(options);
    }

    // database name comes from .env
    async connectProductDatabase(alias, _options: Partial<ConnectionDataOptions> = {}) {
        const product = _options.product || this.getProductName();
        const options = defaultsDeep(
            {
                poolId: this.getPoolId(),
                alias,
                databaseDir: product,
                secretPath: _options.secretPath || this.getDatabaseSecretPath(),
            },
            omit(_options, 'product', 'secretPath'),
        );

        console.log(`Connecting to product database "${product}" with options:`, options);
        return await DynamicDatabase.setDataSource(options);
    }

    // generate problem with entity metadata of other modules inside the same product
    // async connectModuleDatabase(module, _options: any = {}) {
    //     const product = this.getProductName();
    //     const options = defaultsDeep(
    //         {
    //             poolId: this.getPoolId(),
    //             alias: module,
    //             databaseDir: [product, module].join('/'),
    //         },
    //         _options,
    //     );
    //     return await DynamicDatabase.setDataSource(options);
    // }

    async closeConnection(alias) {
        return await DynamicDatabase.closeConnection(alias, this.getPoolId());
    }

    async closeConnections() {
        return await DynamicDatabase.closeConnections(this.getPoolId());
    }

    getDatabaseEnv() {
        return process.env.DB_ENV || this.getSecretsEnv();
    }

    getDefaultDatabaseSecretPath() {
        const defaultSecretPath = ['', this.getDatabaseEnv(), this.getProjectPath(), 'database'].join('/');
        return defaultSecretPath;
    }

    getDatabaseSecretPath() {
        if (this.project._config?.database?.connectBySecret) {
            const secretPath = this.project._config?.database?.secretPath || this.getDefaultDatabaseSecretPath();
            return secretPath;
        }
    }

    async connectM0Database(_options: any = {}) {
        const product = MODULE.M0;
        const options = defaultsDeep(
            {
                poolId: this.getPoolId(),
                alias: product,
                database: MODULE.M0,
                databaseDir: product,
                secretPath: this.getDatabaseSecretPath(),
            },
            _options,
        );
        return await DynamicDatabase.setDataSource(options);
    }

    getService(Service): any {
        return new Service(this.uniqueId);
    }

    buildDatabaseModulePath(databaseDir = '') {
        return `${this.databaseBaseDirPath}/${databaseDir || this.getProductName()}`;
    }

    defineServiceFileName(name) {
        name = name.charAt(0).toLowerCase() + name.slice(1);
        return `${name}.service`;
    }

    defineServiceClassName(name) {
        name = name.charAt(0).toUpperCase() + name.slice(1);
        return `${name}Service`;
    }

    defineEntityClassName(name) {
        name = name.charAt(0).toUpperCase() + name.slice(1);
        return `${name}Entity`;
    }

    async loadServiceClass(shortName, schema = 'public') {
        if (!schema) throw new Error('Schema is required to load service class');
        const basePath = [this.buildDatabaseModulePath(), schema, 'services'].join('/');

        return await this._loadServiceClass(basePath, shortName);
    }

    async loadM0ServiceClass(shortName, schema = 'public') {
        if (!schema) throw new Error('Schema is required to load service class');
        const basePath = [this.buildDatabaseModulePath(MODULE.M0), schema, 'services'].join('/');

        return await this._loadServiceClass(basePath, shortName);
    }

    async _loadServiceClass(dirPath, shortName) {
        const fileName = this.defineServiceFileName(shortName);
        const serviceClassName = this.defineServiceClassName(shortName);
        const entityClassName = this.defineEntityClassName(shortName);

        const module = await this._loadServiceModule(dirPath, fileName);
        const Class_ = module[serviceClassName] || module['Service'];
        const Entity = module[entityClassName] || module['Entity'];

        if (!Class_) throw new Error(`Service "${fileName}" not found at path "${dirPath}" or "Service" export is not defined`);
        if (!Entity) throw new Error(`"Entity" export for service "${fileName}" not found at path "${dirPath}"`);

        const service = this.getService(Class_);
        return { Class_, Entity, service };
    }

    async _loadServiceModule(dirPath, fileName) {
        const module = await importFileMixin(dirPath, fileName);
        if (!module) throw new Error(`Service Module "${fileName}" not found at path "${dirPath}"`);

        return module;
    }

    async getStateService(): Promise<any> {
        return this.getService(StateService);
    }

    async getMonitorService(): Promise<any> {
        return this.getService(MonitorService);
    }
}

export interface DatabaseMixin extends StageStructureProperties {}
