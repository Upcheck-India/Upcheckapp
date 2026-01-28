"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiseaseModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const disease_controller_1 = require("./disease.controller");
const disease_library_entity_1 = require("./disease-library.entity");
const disease_record_entity_1 = require("./disease-record.entity");
const disease_service_1 = require("./disease.service");
let DiseaseModule = class DiseaseModule {
};
exports.DiseaseModule = DiseaseModule;
exports.DiseaseModule = DiseaseModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([disease_library_entity_1.DiseaseLibrary, disease_record_entity_1.DiseaseRecord])],
        controllers: [disease_controller_1.DiseaseController],
        providers: [disease_service_1.DiseaseService],
    })
], DiseaseModule);
//# sourceMappingURL=disease.module.js.map