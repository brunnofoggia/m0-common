import { DynamicDatabase } from 'node-labs/lib/services/dynamicDatabase.service';

export class TraceService<ENTITY> extends DynamicDatabase<ENTITY> {}
