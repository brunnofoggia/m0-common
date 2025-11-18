import { MonitorService as _MonitorService } from '../../../domain/worker/services/monitor.service';
import { MonitorEntity } from '../entities/monitor.entity';
import { MxDatabaseAlias } from '../types/mxModule';

export class MonitorService extends _MonitorService<MonitorEntity> {
    protected override databaseAlias = MxDatabaseAlias;
    protected override entity = MonitorEntity;
}

export { MonitorEntity };
