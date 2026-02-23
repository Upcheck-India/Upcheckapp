import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { SimulationsService } from './simulations.service';
import { RunSimulationDto } from './dto/run-simulation.dto';
@Controller('simulations')
export class SimulationsController {
    constructor(private readonly simulationsService: SimulationsService) { }

    @Post('run')
    runSimulation(@Body() dto: RunSimulationDto, @CurrentUser() user) {
        return this.simulationsService.runSimulation(dto, user.id);
    }
}
