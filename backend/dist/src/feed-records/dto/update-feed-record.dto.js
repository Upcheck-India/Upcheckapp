"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateFeedRecordDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_feed_record_dto_1 = require("./create-feed-record.dto");
class UpdateFeedRecordDto extends (0, mapped_types_1.PartialType)(create_feed_record_dto_1.CreateFeedRecordDto) {
}
exports.UpdateFeedRecordDto = UpdateFeedRecordDto;
//# sourceMappingURL=update-feed-record.dto.js.map