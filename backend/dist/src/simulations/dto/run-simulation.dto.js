"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunSimulationDto = exports.SimulationVariablesDto = exports.SimulationScenarioType = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var SimulationScenarioType;
(function (SimulationScenarioType) {
    SimulationScenarioType["FeedChange"] = "feed_change";
    SimulationScenarioType["PriceChange"] = "price_change";
    SimulationScenarioType["StockingDensity"] = "stocking_density";
})(SimulationScenarioType || (exports.SimulationScenarioType = SimulationScenarioType = {}));
class SimulationVariablesDto {
    feedPrice;
    growthImprovement;
    sellingPrice;
    stockingDensity;
}
exports.SimulationVariablesDto = SimulationVariablesDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], SimulationVariablesDto.prototype, "feedPrice", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], SimulationVariablesDto.prototype, "growthImprovement", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], SimulationVariablesDto.prototype, "sellingPrice", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], SimulationVariablesDto.prototype, "stockingDensity", void 0);
class RunSimulationDto {
    pondId;
    scenarioType;
    variables;
}
exports.RunSimulationDto = RunSimulationDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RunSimulationDto.prototype, "pondId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(SimulationScenarioType),
    __metadata("design:type", String)
], RunSimulationDto.prototype, "scenarioType", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => SimulationVariablesDto),
    __metadata("design:type", SimulationVariablesDto)
], RunSimulationDto.prototype, "variables", void 0);
//# sourceMappingURL=run-simulation.dto.js.map