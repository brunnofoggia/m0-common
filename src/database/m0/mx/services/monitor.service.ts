import { MODULE } from '../../../../types/module.type';
import { MonitorService as _MonitorService } from '../../../../domain/worker/services/monitor.service';
import { MonitorEntity } from '../entities/monitor.entity';

export class MonitorService extends _MonitorService<MonitorEntity> {
    protected override databaseAlias = MODULE.M0;
    protected override entity = MonitorEntity;
}

export { MonitorEntity };
