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
    where: string | string[];
    orderBy: string | string[];
    columns: string | string[];
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
    return `"${tableAlias}"."${columnName_}"`;
};

export const buildColumnAlias = (tableAlias, columnName) => {
    return `${tableAlias}_${columnName}`;
};

export const buildSelectColumn = (tableAlias, columnName_, options: Partial<BuildSelectColumnOptions> = {}) => {
    const [columnName, columnAlias = columnName_] = columnName_.split(' ');

    options = { ...defaultBuildSelectColumnOptions, ...options };
    const alias = !options.makeAlias ? columnAlias : buildColumnAlias(tableAlias, columnAlias);
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

export const buildQuery = (tablePath, alias, queryOptions: PlainQueryOptions): string => {
    const { where = '', columns = [], orderBy = '' } = queryOptions;
    const _columns = selectColumns(alias, columns);
    const _where = buildWhereClause(where);
    const _orderBy = buildOrderByClause(orderBy);

    const query = `SELECT ${_columns} FROM ${tablePath} AS "datatable" ${_where} ${_orderBy}`;
    return query;
};
