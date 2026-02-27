const fs = require('fs');
const path = require('path');

const controllerPath = path.resolve('backend/src/crops/crops.controller.ts');
let content = fs.readFileSync(controllerPath, 'utf8');

content = content.replace(
    "import { CurrentUser } from '../auth/decorators/current-user.decorator';",
    "import { CurrentUser } from '../auth/decorators/current-user.decorator';\nimport { OwnershipGuard } from '../common/guards/ownership.guard';\nimport { OwnsResource } from '../common/decorators/owns-resource.decorator';"
);

content = content.replace("@Post()\n    create", "@Post()\n    @UseGuards(OwnershipGuard)\n    @OwnsResource('Pond', 'pondId', 'farm.userId')\n    create");
content = content.replace("@Get()\n    findAll", "@Get()\n    @UseGuards(OwnershipGuard)\n    @OwnsResource('Pond', 'pondId', 'farm.userId')\n    findAll");
content = content.replace("@Get(':id')\n    findOne", "@Get(':id')\n    @UseGuards(OwnershipGuard)\n    @OwnsResource('Crop', 'id', 'pond.farm.userId')\n    findOne");
content = content.replace("@Patch(':id')\n    update", "@Patch(':id')\n    @UseGuards(OwnershipGuard)\n    @OwnsResource('Crop', 'id', 'pond.farm.userId')\n    update");
content = content.replace("@Patch(':id/harvest')\n    harvest", "@Patch(':id/harvest')\n    @UseGuards(OwnershipGuard)\n    @OwnsResource('Crop', 'id', 'pond.farm.userId')\n    harvest");
content = content.replace("@Delete(':id')\n    remove", "@Delete(':id')\n    @UseGuards(OwnershipGuard)\n    @OwnsResource('Crop', 'id', 'pond.farm.userId')\n    remove");
content = content.replace("@Patch(':id/close')\n    closeCycle", "@Patch(':id/close')\n    @UseGuards(OwnershipGuard)\n    @OwnsResource('Crop', 'id', 'pond.farm.userId')\n    closeCycle");

fs.writeFileSync(controllerPath, content);
