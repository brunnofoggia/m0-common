import { MoreThanOrEqual } from 'typeorm';
import { DynamicDatabase } from 'node-labs/lib/services/dynamicDatabase.service';

import { ModuleExecutionEntity } from '../entities/moduleExecution.entity';
import { uuidGenerate } from '../../../utils/uuid';
import { CrudServiceParamsInterface } from 'node-labs/lib/services/crud.service';
import { IdInterface } from 'node-labs/lib/interfaces/id.interface';

export class ModuleExecutionService extends DynamicDatabase<ModuleExecutionEntity> {
    protected override entity = ModuleExecutionEntity;

    async findByTransactionAndModuleUid(transactionUid: string, moduleUid: string, options: any = {}): Promise<ModuleExecutionEntity> {
        return (
            await this.find({
                ...options,
                where: {
                    ...options.where,
                    transactionUid,
                    moduleConfig: {
                        moduleUid,
                    },
                },
                order: {
                    id: 'DESC',
                },
                take: 1,
            })
        )?.shift();
    }

    async findByTransaction(transactionUid: string): Promise<ModuleExecutionEntity> {
        return (
            await this.find({
                where: {
                    transactionUid,
                },
            })
        )?.shift();
    }

    async findIdByTransaction(transactionUid: string): Promise<number> {
        const result = await this.findByTransaction(transactionUid);
        return result.id;
    }

    async findLastByTransaction(transactionUid: string, options: any = {}): Promise<ModuleExecutionEntity> {
        return (
            await this.find({
                ...options,
                where: {
                    ...options.where,
                    transactionUid,
                },
                order: {
                    id: 'DESC',
                },
                take: 1,
            })
        )?.shift();
    }

    async findIdByTransactionAndModuleUid(transactionUid: string, moduleUid: string): Promise<number> {
        return (
            (
                await this.findByTransactionAndModuleUid(transactionUid, moduleUid, {
                    select: ['id'],
                })
            )?.id || 0
        );
    }

    override async findById(id: number | string, options: any = {}): Promise<ModuleExecutionEntity> {
        const result = await super.findById(id, {
            ...options,
            relations: {
                ...options.relations,
                stagesExecution: true,
            },
        });

        return result;
    }

    async findByProjectUidAndDateAndModuleUid(projectUid, date, moduleUid = '', _options: any = {}): Promise<ModuleExecutionEntity[]> {
        const options: any = {
            ..._options,
            where: {
                projectUid,
                date: MoreThanOrEqual(date),
                ..._options.where,
            },
            order: {
                id: 'DESC',
            },
        };
        if (moduleUid) {
            options.where.moduleConfig = {
                moduleUid,
            };
        }
        const moduleExecutionList = await this.find(options);
        return moduleExecutionList;
    }

    async findOneByProjectUidAndDateAndModuleUid(projectUid, date, moduleUid = '', options: any = {}) {
        return (
            await this.findByProjectUidAndDateAndModuleUid(projectUid, date, moduleUid, {
                ...options,
                take: 1,
            })
        )?.shift();
    }

    async generateUnusedTransactionUid() {
        const transactionUid = uuidGenerate();
        const moduleExecution = await this.findLastByTransaction(transactionUid);

        if (moduleExecution) return await this.generateUnusedTransactionUid();
        return transactionUid;
    }

    override async create(
        item: ModuleExecutionEntity,
        params?: Partial<CrudServiceParamsInterface>,
    ): Promise<IdInterface | ModuleExecutionEntity> {
        if (!item.transactionUid) item.transactionUid = await this.generateUnusedTransactionUid();
        return await super.create(item, params);
    }
}
