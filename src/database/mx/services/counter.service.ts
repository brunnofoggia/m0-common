import { CounterEntity } from '../entities/counter.entity';
import { DynamicDatabase } from 'node-labs/lib/services/dynamicDatabase.service';
import { MxDatabaseAlias } from '../types/mxModule';

export class CounterService extends DynamicDatabase<CounterEntity> {
    protected override databaseAlias = MxDatabaseAlias;
    protected override entity = CounterEntity;
}

export { CounterEntity };
