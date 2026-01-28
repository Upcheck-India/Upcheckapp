"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateInventoryItemDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_inventory_item_dto_1 = require("./create-inventory-item.dto");
class UpdateInventoryItemDto extends (0, mapped_types_1.PartialType)(create_inventory_item_dto_1.CreateInventoryItemDto) {
}
exports.UpdateInventoryItemDto = UpdateInventoryItemDto;
//# sourceMappingURL=update-inventory-item.dto.js.map