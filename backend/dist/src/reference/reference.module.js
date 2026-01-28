"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferenceModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const reference_service_1 = require("./reference.service");
const reference_controller_1 = require("./reference.controller");
const hatchery_entity_1 = require("./entities/hatchery.entity");
const species_entity_1 = require("./entities/species.entity");
const broodstock_entity_1 = require("./entities/broodstock.entity");
let ReferenceModule = class ReferenceModule {
};
exports.ReferenceModule = ReferenceModule;
exports.ReferenceModule = ReferenceModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([hatchery_entity_1.Hatchery, species_entity_1.Species, broodstock_entity_1.Broodstock])],
        providers: [reference_service_1.ReferenceService],
        controllers: [reference_controller_1.ReferenceController],
        exports: [typeorm_1.TypeOrmModule],
    })
], ReferenceModule);
//# sourceMappingURL=reference.module.js.map