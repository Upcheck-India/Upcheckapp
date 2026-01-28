"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MortalityModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const mortality_controller_1 = require("./mortality.controller");
const mortality_record_entity_1 = require("./mortality-record.entity");
const mortality_service_1 = require("./mortality.service");
let MortalityModule = class MortalityModule {
};
exports.MortalityModule = MortalityModule;
exports.MortalityModule = MortalityModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([mortality_record_entity_1.MortalityRecord])],
        controllers: [mortality_controller_1.MortalityController],
        providers: [mortality_service_1.MortalityService],
    })
], MortalityModule);
//# sourceMappingURL=mortality.module.js.map