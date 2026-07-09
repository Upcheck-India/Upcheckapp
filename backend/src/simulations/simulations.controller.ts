import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SimulationsService } from './simulations.service';
import { RunSimulationDto } from './dto/run-simulation.dto';
@Controller('simulations')
export class SimulationsController {
  constructor(private readonly simulationsService: SimulationsService) {}

  @Post('run')
  runSimulation(@Body() dto: RunSimulationDto, @CurrentUser() user) {
    return this.simulationsService.runSimulation(dto, user.id);
  }

  @Get()
  findMine(@CurrentUser() user, @Query('pondId') pondId?: string) {
    if (pondId) {
      return this.simulationsService.findByPond(pondId, user.id);
    }
    return this.simulationsService.findByUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user) {
    return this.simulationsService.findOne(id, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user) {
    return this.simulationsService.remove(id, user.id);
  }
}
