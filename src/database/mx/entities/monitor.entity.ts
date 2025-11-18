import { Entity } from 'typeorm';

import { MonitorEntity as _MonitorEntity } from '../../../domain/worker/entities/monitor.entity';
import { MxModuleEnum } from '../types/mxModule';

@Entity({ name: 'monitor', schema: MxModuleEnum.RELIABILITY })
export class MonitorEntity extends _MonitorEntity {}
