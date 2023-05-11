import { Module } from '@nestjs/common';
import { WorkerController } from './worker.controller';
import { ModuleDomain } from './module.domain';

@Module({
    imports: [],
    controllers: [WorkerController],
    providers: [ModuleDomain],
    exports: [ModuleDomain],
})
export class WorkerModule { }
