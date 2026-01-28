"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePondDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_pond_dto_1 = require("./create-pond.dto");
class UpdatePondDto extends (0, mapped_types_1.PartialType)(create_pond_dto_1.CreatePondDto) {
}
exports.UpdatePondDto = UpdatePondDto;
//# sourceMappingURL=update-pond.dto.js.map