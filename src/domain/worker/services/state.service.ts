import { Like } from 'typeorm';
import { DynamicDatabase } from 'node-labs/lib/services/dynamicDatabase.service';
import { map } from 'lodash';

export class StateService<ENTITY> extends DynamicDatabase<ENTITY> {
    async _save(key, value) {
        return await this.getRepository().save({ key, value: value + '' });
    }

    async save(key, value, retry = 3) {
        let result;
        try {
            result = await this._save(key, value);
        } catch (err) {
            if (retry) {
                return await this.save(key, value, retry - 1);
            }
            throw err;
        }
        return result;
    }

    async saveBy(key, valueTo, valueFrom) {
        return (
            await this.getDataSource()
                .createQueryBuilder()
                .update(this.entity)
                .set({
                    value: valueTo,
                })
                .where('key = :key AND value = :value', { key, value: valueFrom })
                .execute()
        ).affected;
    }

    async increment(key) {
        return await this.getDataSource()
            .createQueryBuilder()
            .update(this.entity)
            .set({
                value: () => 'CAST(value AS INTEGER) + 1',
            })
            .where('key = :key', { key })
            .execute();
    }

    async decrement(key) {
        return await this.getDataSource()
            .createQueryBuilder()
            .update(this.entity)
            .set({
                value: () => 'CAST(value AS INTEGER) - 1',
            })
            .where('key = :key', { key })
            .execute();
    }

    async countSequence(key) {
        return await this.getRepository().count({
            where: {
                key: Like(key + '_%'),
                value: '1',
            },
        });
    }

    async clearSequence(key) {
        return await this.getDataSource()
            .createQueryBuilder()
            .update(this.entity)
            .set({
                value: '0',
            })
            .where("key LIKE(:key || '_%')", { key })
            .execute();
    }

    async clearByPrefix(prefix) {
        return await this.getRepository().delete({
            key: Like(prefix + '%'),
        });
    }

    async getValue(key) {
        return ((await this.getRepository().find({ where: { key } }))[0] || {}).value;
    }

    async getValuesByPrefix(key) {
        return map(await this.getRepository().find({ where: { key: Like(key + '%') } }), (item) => item.value);
    }

    async push(key, value) {
        if (!value && value !== 0) return [];

        return await this.save(key + '.' + value, value + '');
    }

    async getArray(key) {
        const value = await this.getValuesByPrefix(key);
        if (!value) return [];
        return value;
    }
}
