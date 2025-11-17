import { isArray } from 'lodash';
import indexOf from 'lodash';

export interface BuildSelectColumnOptions {
    makeAlias: boolean;
}

export const defaultBuildSelectColumnOptions: BuildSelectColumnOptions = {
    makeAlias: false,
};

export interface SelectColumnOptions {
    clearSelection: boolean;
    makeAlias: boolean;
}

export interface PlainQueryOptions {
    alias?: string;
    where: string | string[];
    orderBy: string | string[];
    groupBy: string | string[];
    columns: string | string[];
    join?: PlainJoinOptions[];
    offset?: number;
    limit?: number;
}

export interface PlainJoinOptions {
    tablePath: string;
    alias: string;
    condition: string[];
    type: keyof JoinTypeEnum;
}

export enum JoinTypeEnum {
    INNER = 'INNER',
    LEFT = 'LEFT',
    RIGHT = 'RIGHT',
}

export const countQueryBuilder = async (service, queryBuilder) => {
    const query = `
            SELECT COUNT(*) as "count" FROM (
                ${queryBuilder.getQuery()}
            ) as r
        `;

    const rawData = (await service.getRepository().query(query))?.shift() || {};
    return +rawData?.count;
};

export const countQuery = async (dataSource, query) => {
    const _countQuery = `
            SELECT COUNT(*) as "count" FROM (
                ${query}
            ) as r
        `;

    const rawData = (await dataSource.query(_countQuery))?.shift() || {};
    return +rawData?.count;
};

export const buildColumnName = (tableAlias, columnPath) => {
    // allows use of functions like SUM, AVG, etc.
    // also allows to specify table.column format
    const hasNonWordCharacters = /\W+/.test(columnPath);
    if (hasNonWordCharacters) {
        if (/^\w+\.\w+$/.test(columnPath)) {
            const [tableAliasFromColumn, columnName] = columnPath.split('.');
            return `"${tableAliasFromColumn}"."${columnName}"`;
        }

        return columnPath;
    }

    return `"${tableAlias}"."${columnPath}"`;
};

export const buildColumnAlias = (tableAlias, columnAlias, options: Partial<BuildSelectColumnOptions> = {}) => {
    let alias = columnAlias;
    const hasNonWordCharacters = /\W+/.test(alias);
    if (options.makeAlias && !hasNonWordCharacters) alias = `${tableAlias}_${columnAlias}`;

    // to allow use of functions like SUM, AVG, etc.
    if (hasNonWordCharacters) alias = alias.replace(/"/g, '').replace(/\W+/g, '_').toLowerCase();
    return alias;
};

export const buildSelectColumn = (tableAlias, columnName_, options: Partial<BuildSelectColumnOptions> = {}) => {
    const [columnPath, _columnAlias] = columnName_.split(' ');
    // const columnName = columnPath.split('.').pop();
    let columnAlias = _columnAlias || columnPath;

    options = { ...defaultBuildSelectColumnOptions, ...options };
    const alias = buildColumnAlias(tableAlias, columnAlias, options);

    return [buildColumnName(tableAlias, columnPath), alias];
};

export const selectColumns = (alias, columns, options_: Partial<SelectColumnOptions> = {}): string => {
    const options = { ...defaultBuildSelectColumnOptions, ...options_ };
    if (!columns || !columns.length) {
        return '*';
    } else if (!isArray(columns)) {
        columns = [columns];
    }

    const _columns = [];
    columns.forEach((column) => {
        const columnData = typeof column === 'string' ? buildSelectColumn(alias, column, options as BuildSelectColumnOptions) : column;
        _columns.push(columnData);
    });

    return _columns
        .map((columnData) => {
            const [columnName, columnAlias] = columnData;
            if (columnName.indexOf('*') !== -1) {
                return columnName;
            }
            return `${columnName} AS ${columnAlias}`;
        })
        .join(', ');
};

export const buildWhereClause = (where): string => {
    if (!where) return '';
    if (!isArray(where)) {
        where = [where];
    }
    if (!where.length) return '';
    return ` WHERE ` + where.map((clause) => `(${clause})`).join(' AND ') + '\n';
};

export const buildOrderByClause = (orderBy): string => {
    if (!orderBy) return '';
    if (!isArray(orderBy)) {
        orderBy = [orderBy];
    }
    if (!orderBy.length) return '';
    return ` ORDER BY ${orderBy.join(', ')}\n`;
};

export const buildGroupByClause = (groupBy): string => {
    if (!groupBy) return '';
    if (!isArray(groupBy)) {
        groupBy = [groupBy];
    }
    if (!groupBy.length) return '';
    return ` GROUP BY ${groupBy.join(', ')}\n`;
};

export const buildJoins = (queryOptions: PlainQueryOptions): string => {
    if (!queryOptions.join || !queryOptions.join.length) return '';

    return queryOptions.join
        .map((join) => {
            const alias = join.alias || join.tablePath.replace(/"/g, '').split('.').pop();
            const joinTypeKey = (join.type.toString() + '').toUpperCase();
            const joinType = JoinTypeEnum[joinTypeKey] || null;
            if (!joinType) throw new Error(`Invalid join type "${joinTypeKey}" specified.`);

            const conditions = join.condition.map((condition) => `(${condition})`).join(' AND ');
            return ` ${joinType} JOIN ${join.tablePath} AS "${alias}" ON ${conditions} \n`;
        })
        .join(' ');
};

export const buildPaginationClause = (offset?: number, limit?: number): string => {
    let pagination = '';
    if (offset || limit) {
        const _offset = offset ? ` OFFSET ${offset}` : '';
        const _limit = limit ? ` LIMIT ${limit}` : '';
        pagination = `${_offset}${_limit}\n`;
    }
    return pagination;
};

export const buildQuery = (tablePath, queryOptions: PlainQueryOptions): string => {
    const { where = '', columns = [], orderBy = '', join = [], offset, limit, groupBy } = queryOptions;
    if (!queryOptions.alias) queryOptions.alias = 'datatable';

    const _columns = selectColumns(queryOptions.alias, columns);
    const _joins = buildJoins(queryOptions);
    const _where = buildWhereClause(where);
    const _orderBy = buildOrderByClause(orderBy);
    const _groupBy = buildGroupByClause(groupBy);
    const pagination = buildPaginationClause(offset, limit);

    const query = `
        SELECT
            ${_columns}
        FROM ${tablePath} AS "${queryOptions.alias}"
        ${_joins} ${_where} ${_groupBy} ${_orderBy} ${pagination}
    `.trim();
    return query;
};
