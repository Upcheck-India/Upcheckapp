const fs = require('fs');
const path = require('path');

const controllerPath = path.resolve('backend/src/farms/farms.controller.ts');
let controllerContent = fs.readFileSync(controllerPath, 'utf8');

controllerContent = controllerContent.replace(
    "import { CurrentUser } from '../auth/decorators/current-user.decorator';",
    "import { CurrentUser } from '../auth/decorators/current-user.decorator';\nimport { OwnershipGuard } from '../common/guards/ownership.guard';\nimport { OwnsResource } from '../common/decorators/owns-resource.decorator';"
);

controllerContent = controllerContent.replace(
    "findOne(@Param('id') id: string, @CurrentUser() user) {",
    "@UseGuards(OwnershipGuard)\n    @OwnsResource('Farm')\n    findOne(@Param('id') id: string) {"
);

controllerContent = controllerContent.replace(
    "return this.farmsService.findOne(id, user.id);",
    "return this.farmsService.findOne(id);"
);

controllerContent = controllerContent.replace(
    "update(@Param('id') id: string, @Body() updateFarmDto: UpdateFarmDto, @CurrentUser() user) {",
    "@UseGuards(OwnershipGuard)\n    @OwnsResource('Farm')\n    update(@Param('id') id: string, @Body() updateFarmDto: UpdateFarmDto) {"
);

controllerContent = controllerContent.replace(
    "return this.farmsService.update(id, updateFarmDto, user.id);",
    "return this.farmsService.update(id, updateFarmDto);"
);

controllerContent = controllerContent.replace(
    "remove(@Param('id') id: string, @CurrentUser() user) {",
    "@UseGuards(OwnershipGuard)\n    @OwnsResource('Farm')\n    remove(@Param('id') id: string) {"
);

controllerContent = controllerContent.replace(
    "return this.farmsService.remove(id, user.id);",
    "return this.farmsService.remove(id);"
);

fs.writeFileSync(controllerPath, controllerContent);

const servicePath = path.resolve('backend/src/farms/farms.service.ts');
let serviceContent = fs.readFileSync(servicePath, 'utf8');

// Replace findOne
serviceContent = serviceContent.replace(
    "async findOne(id: string, userId: string) {\n        return this.verifyOwnership(id, userId);\n    }",
    "async findOne(id: string) {\n        const farm = await this.farmsRepository.findOneBy({ id });\n        if (!farm || farm.deletedAt) throw new NotFoundException(`Farm with ID ${id} not found`);\n        return farm;\n    }"
);

// Replace update
serviceContent = serviceContent.replace(
    "async update(id: string, updateFarmDto: UpdateFarmDto, userId: string) {\n        await this.verifyOwnership(id, userId);\n        await this.farmsRepository.update(id, updateFarmDto);\n        return this.verifyOwnership(id, userId);\n    }",
    "async update(id: string, updateFarmDto: UpdateFarmDto) {\n        await this.farmsRepository.update(id, updateFarmDto);\n        return this.findOne(id);\n    }"
);

// Replace remove
serviceContent = serviceContent.replace(
    "async remove(id: string, userId: string) {\n        await this.verifyOwnership(id, userId);\n        // Soft delete\n        await this.farmsRepository.update(id, { deletedAt: new Date() });\n        return { message: 'Farm archived successfully' };\n    }",
    "async remove(id: string) {\n        // Soft delete\n        await this.farmsRepository.update(id, { deletedAt: new Date() });\n        return { message: 'Farm archived successfully' };\n    }"
);

fs.writeFileSync(servicePath, serviceContent);
