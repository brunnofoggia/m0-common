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

interface BuildSelectColumnOptions {
    makeAlias: boolean;
}

const defaultBuildSelectColumnOptions: BuildSelectColumnOptions = {
    makeAlias: false,
};

export const buildSelectColumn = (tableAlias, columnName_, options: Partial<BuildSelectColumnOptions> = {}) => {
    options = { ...defaultBuildSelectColumnOptions, ...options };
    const alias = !options.makeAlias ? columnName_ : buildColumnAlias(tableAlias, columnName_);
    return [buildColumnName(tableAlias, columnName_), alias];
};
