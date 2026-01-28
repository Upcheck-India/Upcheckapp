"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanktonModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const plankton_controller_1 = require("./plankton.controller");
const plankton_data_entity_1 = require("./plankton-data.entity");
const plankton_service_1 = require("./plankton.service");
let PlanktonModule = class PlanktonModule {
};
exports.PlanktonModule = PlanktonModule;
exports.PlanktonModule = PlanktonModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([plankton_data_entity_1.PlanktonData])],
        controllers: [plankton_controller_1.PlanktonController],
        providers: [plankton_service_1.PlanktonService],
    })
], PlanktonModule);
//# sourceMappingURL=plankton.module.js.map