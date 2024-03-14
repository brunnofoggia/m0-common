export const countQueryBuilder = async (service, queryBuilder) => {
    const query = `
            SELECT COUNT(*) as "count" FROM (
                ${queryBuilder.getQuery()}
            ) as r
        `;

    const rawData = (await service.getRepository().query(query))?.shift() || {};
    return +rawData?.count;
};

export const buildColumnName = (tableAlias, columnName_) => {
    return `"${tableAlias}"."${columnName_}"`;
};

export const buildColumnAlias = (tableAlias, columnName) => {
    return `${tableAlias}_${columnName}`;
};

export interface BuildSelectColumnOptions {
    makeAlias: boolean;
}

const defaultBuildSelectColumnOptions: BuildSelectColumnOptions = {
    makeAlias: false,
};

export const buildSelectColumn = (tableAlias, columnName_, options: Partial<BuildSelectColumnOptions> = {}) => {
    const [columnName, columnAlias = columnName_] = columnName_.split(' ');

    options = { ...defaultBuildSelectColumnOptions, ...options };
    const alias = !options.makeAlias ? columnAlias : buildColumnAlias(tableAlias, columnAlias);
    return [buildColumnName(tableAlias, columnName), alias];
};
