"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShrimpCalculationsModule = void 0;
const common_1 = require("@nestjs/common");
const shrimp_calculations_service_1 = require("./shrimp-calculations.service");
const shrimp_calculations_controller_1 = require("./shrimp-calculations.controller");
let ShrimpCalculationsModule = class ShrimpCalculationsModule {
};
exports.ShrimpCalculationsModule = ShrimpCalculationsModule;
exports.ShrimpCalculationsModule = ShrimpCalculationsModule = __decorate([
    (0, common_1.Module)({
        providers: [shrimp_calculations_service_1.ShrimpCalculationsService],
        controllers: [shrimp_calculations_controller_1.ShrimpCalculationsController]
    })
], ShrimpCalculationsModule);
//# sourceMappingURL=shrimp-calculations.module.js.map