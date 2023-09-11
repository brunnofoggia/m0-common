import { MoreThanOrEqual } from 'typeorm';
import { CrudService } from 'node-common/dist/services/crud.service';

import { ModuleExecutionEntity } from '../entities/moduleExecution.entity';

export class ModuleExecutionService extends CrudService<ModuleExecutionEntity> {
    protected entity = ModuleExecutionEntity;

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

    async findById(id: number | string, options: any = {}): Promise<ModuleExecutionEntity> {
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
}
