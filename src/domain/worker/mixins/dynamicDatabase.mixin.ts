import { cloneDeep, defaultsDeep, omit, uniqueId } from 'lodash';
import { DynamicDatabase } from 'node-labs/lib/services/dynamicDatabase.service';

import { DatabaseMixin } from './system/database.mixin';
import { ConnectionData, ConnectionDataOptions } from '../interfaces/connection';

export abstract class DynamicDatabaseMixin {
    abstract rootDir: string;
    abstract log(...args: any[]): void;

    getDynamicDatabaseName() {
        const dynamicDatabaseName = [];
        if (this.project._config?.database?.dynamicDatabaseNamePrefix) {
            dynamicDatabaseName.push(this.project._config?.database?.dynamicDatabaseNamePrefix);
        }
        dynamicDatabaseName.push(this.rootDir.replace(/\//g, '-'));
        dynamicDatabaseName.push(this.getProductName());

        return dynamicDatabaseName.join('-');
    }

    getDynamicDir() {
        return ['dynamic', this.getProductName()].join('_');
        // return BCARD_DYNAMIC;
    }

    getDynamicDatabaseOptions() {
        return {
            alias: this.getDynamicDir(),
            poolId: this.getPoolId(),
        };
    }

    async connectDynamicDatabase(_options: Partial<ConnectionDataOptions> = {}) {
        const options = defaultsDeep(_options, {
            database: this.getDynamicDatabaseName(),
            databaseDir: this.getDynamicDir(),
            secretPath: this.getDatabaseSecretPath(),
            ...this.getDynamicDatabaseOptions(),
        });
        return await DynamicDatabase.setDataSource(options);
    }

    getDynamicDatabaseSource() {
        const { alias, poolId } = this.getDynamicDatabaseOptions();
        return DynamicDatabase.getDataSource(alias, poolId);
    }

    async closeDynamicConnection() {
        const { alias, poolId } = this.getDynamicDatabaseOptions();
        return await DynamicDatabase.closeConnection(alias, poolId);
    }

    buildDynamicDatabaseModulePath() {
        return `${this.databaseBaseDirPath}/${this.getDynamicDir()}`;
    }

    async loadDynamicServiceClass(shortName, schema = 'public') {
        if (!schema) throw new Error('Schema is required to load service class');
        const basePath = [this.buildDynamicDatabaseModulePath(), schema, 'services'].join('/');

        return await this._loadServiceClass(basePath, shortName);
    }

    async customizableDatabaseConnection(connData: Partial<ConnectionData> = {}): Promise<any> {
        const isDynamic = !!connData.isDynamic;
        const connOptions: Partial<ConnectionDataOptions> = connData.options || {};
        const alias = connData.alias || uniqueId('custom');

        let conn;
        if (isDynamic) {
            conn = await this.connectDynamicDatabase(connOptions);
            this.log('Dynamic connection established');
        } else {
            conn = await this.connectProductDatabase(alias, connOptions);
            this.log('Connection established');
        }

        return conn;
    }
}

export interface DynamicDatabaseMixin extends DatabaseMixin {}
