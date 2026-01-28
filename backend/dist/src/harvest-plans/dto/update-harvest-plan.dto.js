"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateHarvestPlanDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_harvest_plan_dto_1 = require("./create-harvest-plan.dto");
class UpdateHarvestPlanDto extends (0, mapped_types_1.PartialType)(create_harvest_plan_dto_1.CreateHarvestPlanDto) {
}
exports.UpdateHarvestPlanDto = UpdateHarvestPlanDto;
//# sourceMappingURL=update-harvest-plan.dto.js.map