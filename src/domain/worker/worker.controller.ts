import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ModuleDomain } from './module.domain';
import { BodyInterface } from '../../interfaces/body.interface';
// import axios from 'axios';

@Controller('worker')
export class WorkerController {
    constructor(private readonly domain: ModuleDomain) {}

    @Post()
    async initialize(@Body() body: BodyInterface): Promise<any> {
        return this.domain.initialize(body);
    }

    @Post('async')
    async execute(@Body() body: BodyInterface): Promise<any> {
        setTimeout(async () => await this.domain.initialize(body), 0);
        return { status: 'executing' };
    }

    @Get('skipQueues/:value')
    async skipQueues(@Param('value') value: string): Promise<any> {
        ModuleDomain.skipQueues = value === '1' ? true : false;
    }
}
