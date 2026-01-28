import { SimulationsService } from './simulations.service';
import { RunSimulationDto } from './dto/run-simulation.dto';
export declare class SimulationsController {
    private readonly simulationsService;
    constructor(simulationsService: SimulationsService);
    runSimulation(dto: RunSimulationDto, req: any): Promise<{
        simulation: import("./simulation.entity").Simulation;
        result: import("./simulations.service").SimulationResult;
    }>;
}
