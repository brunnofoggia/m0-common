import { Entity } from 'typeorm';

import { MODULE } from '../../../../types/module.type';
import { MonitorEntity as _MonitorEntity } from '../../../../domain/worker/entities/monitor.entity';

@Entity({ name: 'monitor', schema: MODULE.MX })
export class MonitorEntity extends _MonitorEntity {}
