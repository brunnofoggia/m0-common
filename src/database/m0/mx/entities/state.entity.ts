import { Entity } from 'typeorm';

import { MODULE } from '../../../../types/module.type';
import { StateEntity as _StateEntity } from '../../../../domain/worker/entities/state.entity';

@Entity({ name: 'state', schema: MODULE.MX })
export class StateEntity extends _StateEntity {}
