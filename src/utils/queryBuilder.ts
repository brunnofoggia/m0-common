import { BuildSelectColumnOptions, buildSelectColumn } from './service';

export interface SelectColumnOptions {
    clearSelection: boolean;
    makeAlias: boolean;
}

const defaultSelectColumnOptions: SelectColumnOptions = {
    clearSelection: false,
    makeAlias: false,
};

export const selectColumns = (queryBuilder, alias, columns, options_: Partial<SelectColumnOptions> = {}) => {
    const options = { ...defaultSelectColumnOptions, ...options_ };

    let counter = 0;
    columns.forEach((column) => {
        const columnData = typeof column === 'string' ? buildSelectColumn(alias, column, options as BuildSelectColumnOptions) : column;
        if (!options.clearSelection || !!counter++) queryBuilder.addSelect(...columnData); // [column, alias] => "column", "alias"
        else queryBuilder.select(...columnData);
    });
};
