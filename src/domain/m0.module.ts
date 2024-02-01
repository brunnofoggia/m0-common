import { Global, Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';

import { WorkerModule } from './worker/worker.module';
import { router } from 'node-labs/lib/utils/moduleRouter';
import { MODULE } from '../types/module.type';

const modules = [WorkerModule];

@Global()
@Module({
    imports: [RouterModule.register(router(MODULE.M0, modules)), ...modules],
    controllers: [],
    providers: [],
    exports: [],
})
export class M0Module {}
