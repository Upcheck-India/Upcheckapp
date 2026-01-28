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
exports.CreateMicrobiologyDataDto = void 0;
const class_validator_1 = require("class-validator");
class CreateMicrobiologyDataDto {
    cropId;
    measurementDate;
    totalBacillusCfuMl;
    totalVibrioCountTvcCfuMl;
    yellowVibrioCountTvcCfuMl;
    greenVibrioCountTvcCfuMl;
    luminescentBacteriaLbCfuMl;
    note;
}
exports.CreateMicrobiologyDataDto = CreateMicrobiologyDataDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateMicrobiologyDataDto.prototype, "cropId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateMicrobiologyDataDto.prototype, "measurementDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateMicrobiologyDataDto.prototype, "totalBacillusCfuMl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateMicrobiologyDataDto.prototype, "totalVibrioCountTvcCfuMl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateMicrobiologyDataDto.prototype, "yellowVibrioCountTvcCfuMl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateMicrobiologyDataDto.prototype, "greenVibrioCountTvcCfuMl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateMicrobiologyDataDto.prototype, "luminescentBacteriaLbCfuMl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMicrobiologyDataDto.prototype, "note", void 0);
//# sourceMappingURL=create-microbiology-data.dto.js.map