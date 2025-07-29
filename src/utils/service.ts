import { isArray } from 'lodash';

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
    offset?: number;
    limit?: number;
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

export const buildColumnName = (tableAlias, columnName_) => {
    // to allow use of functions like SUM, AVG, etc.
    if (/\W+/.test(columnName_)) {
        return columnName_;
    }

    return `"${tableAlias}"."${columnName_}"`;
};

export const buildColumnAlias = (tableAlias, columnAlias, options: Partial<BuildSelectColumnOptions> = {}) => {
    let alias = columnAlias;
    if (options.makeAlias) alias = `${tableAlias}_${columnAlias}`;

    // to allow use of functions like SUM, AVG, etc.
    if (/\W+/.test(alias)) alias = alias.replace(/\W+/g, '_');
    return alias;
};

export const buildSelectColumn = (tableAlias, columnName_, options: Partial<BuildSelectColumnOptions> = {}) => {
    const [columnName, columnAlias = columnName_] = columnName_.split(' ');

    options = { ...defaultBuildSelectColumnOptions, ...options };
    const alias = buildColumnAlias(tableAlias, columnAlias, options);

    return [buildColumnName(tableAlias, columnName), alias];
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
            return `${columnName} AS ${columnAlias}`;
        })
        .join(', ');
};

export const buildWhereClause = (where): string => {
    if (!where) return '';
    if (!isArray(where)) {
        where = [where];
    }
    return ` WHERE ` + where.map((clause) => `(${clause})`).join(' AND ');
};

export const buildOrderByClause = (orderBy): string => {
    if (!orderBy) return '';
    if (!isArray(orderBy)) {
        orderBy = [orderBy];
    }
    return ` ORDER BY ${orderBy.join(', ')}`;
};

export const buildGroupByClause = (groupBy): string => {
    if (!groupBy) return '';
    if (!isArray(groupBy)) {
        groupBy = [groupBy];
    }
    return ` GROUP BY ${groupBy.join(', ')}`;
};

export const buildQuery = (tablePath, queryOptions: PlainQueryOptions): string => {
    const { where = '', columns = [], orderBy = '', offset, limit, groupBy } = queryOptions;
    if (!queryOptions.alias) queryOptions.alias = 'datatable';

    const _columns = selectColumns(queryOptions.alias, columns);
    const _where = buildWhereClause(where);
    const _orderBy = buildOrderByClause(orderBy);
    const _groupBy = buildGroupByClause(groupBy);

    let pagination = '';
    if (offset || limit) {
        const _offset = offset ? ` OFFSET ${offset}` : '';
        const _limit = limit ? ` LIMIT ${limit}` : '';
        pagination = `${_offset}${_limit}`;
    }

    const query = `SELECT ${_columns} FROM ${tablePath} AS "${queryOptions.alias}" ${_where} ${_groupBy} ${_orderBy} ${pagination}`.trim();
    return query;
};
