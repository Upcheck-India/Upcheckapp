"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MicrobiologyModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const microbiology_controller_1 = require("./microbiology.controller");
const microbiology_data_entity_1 = require("./microbiology-data.entity");
const microbiology_service_1 = require("./microbiology.service");
let MicrobiologyModule = class MicrobiologyModule {
};
exports.MicrobiologyModule = MicrobiologyModule;
exports.MicrobiologyModule = MicrobiologyModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([microbiology_data_entity_1.MicrobiologyData])],
        controllers: [microbiology_controller_1.MicrobiologyController],
        providers: [microbiology_service_1.MicrobiologyService],
    })
], MicrobiologyModule);
//# sourceMappingURL=microbiology.module.js.map