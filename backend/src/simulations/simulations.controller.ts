import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { SimulationsService } from './simulations.service';
import { RunSimulationDto } from './dto/run-simulation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('simulations')
@UseGuards(JwtAuthGuard)
export class SimulationsController {
    constructor(private readonly simulationsService: SimulationsService) { }

    @Post('run')
    runSimulation(@Body() dto: RunSimulationDto, @Request() req) {
        return this.simulationsService.runSimulation(dto, req.user.id);
    }
}
