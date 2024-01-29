import { buildSelectColumn } from './service';

export const selectColumns = (queryBuilder, alias, columns, options = { clearSelection: false }) => {
    let counter = 0;
    columns.forEach((column) => {
        const columnData = typeof column === 'string' ? buildSelectColumn(alias, column) : column;
        if (!options.clearSelection || !!counter++) queryBuilder.addSelect(...columnData);
        else queryBuilder.select(...columnData);
    });
};
