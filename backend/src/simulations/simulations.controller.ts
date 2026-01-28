import { Body, Controller, Post } from '@nestjs/common';
import { SimulationsService } from './simulations.service';
import { RunSimulationDto } from './dto/run-simulation.dto';

@Controller('simulations')
export class SimulationsController {
    constructor(private readonly simulationsService: SimulationsService) { }

    @Post('run')
    runSimulation(@Body() dto: RunSimulationDto) {
        return this.simulationsService.runSimulation(dto);
    }
}
