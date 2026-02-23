const fs = require('fs');
const path = require('path');

const controllerPath = path.resolve('backend/src/ponds/ponds.controller.ts');
let controllerContent = fs.readFileSync(controllerPath, 'utf8');

controllerContent = controllerContent.replace(
    "import { CurrentUser } from '../auth/decorators/current-user.decorator';",
    "import { CurrentUser } from '../auth/decorators/current-user.decorator';\nimport { OwnershipGuard } from '../common/guards/ownership.guard';\nimport { OwnsResource } from '../common/decorators/owns-resource.decorator';"
);

// Apply guards to PondsController
controllerContent = controllerContent.replace(
    "@Post()\n    create",
    "@Post()\n    @UseGuards(OwnershipGuard)\n    @OwnsResource('Farm', 'farmId')\n    create"
);

controllerContent = controllerContent.replace(
    "@Get()\n    findAll",
    "@Get()\n    @UseGuards(OwnershipGuard)\n    @OwnsResource('Farm', 'farmId')\n    findAll"
);

controllerContent = controllerContent.replace(
    "@Get(':id')\n    findOne",
    "@Get(':id')\n    @UseGuards(OwnershipGuard)\n    @OwnsResource('Pond', 'id', 'farm.userId')\n    findOne"
);

controllerContent = controllerContent.replace(
    "@Patch(':id')\n    update",
    "@Patch(':id')\n    @UseGuards(OwnershipGuard)\n    @OwnsResource('Pond', 'id', 'farm.userId')\n    update"
);

controllerContent = controllerContent.replace(
    "@Patch(':id/archive')\n    archive",
    "@Patch(':id/archive')\n    @UseGuards(OwnershipGuard)\n    @OwnsResource('Pond', 'id', 'farm.userId')\n    archive"
);

controllerContent = controllerContent.replace(
    "@Delete(':id')\n    remove",
    "@Delete(':id')\n    @UseGuards(OwnershipGuard)\n    @OwnsResource('Pond', 'id', 'farm.userId')\n    remove"
);

controllerContent = controllerContent.replace(
    "@Get(':id/dimension-history')\n    getDimensionHistory",
    "@Get(':id/dimension-history')\n    @UseGuards(OwnershipGuard)\n    @OwnsResource('Pond', 'id', 'farm.userId')\n    getDimensionHistory"
);

// We keep the old signatures but some of the parameters might not be needed by the service now.
// For now, we leave the controller calling the service with user.id, but update the Service.

fs.writeFileSync(controllerPath, controllerContent);

const servicePath = path.resolve('backend/src/ponds/ponds.service.ts');
let serviceContent = fs.readFileSync(servicePath, 'utf8');

// Replace findOne
serviceContent = serviceContent.replace(
    "    async findOne(id: string, userId: string) {\n        const pond = await this.pondsRepository.findOne({\n            where: { id },\n            relations: ['farm'],\n        });\n\n        if (!pond) {\n            throw new NotFoundException(`Pond with ID ${id} not found`);\n        }\n\n        if (pond.farm.userId !== userId) {\n            throw new ForbiddenException('You do not have permission to access this pond');\n        }\n\n        return pond;\n    }",
    "    async findOne(id: string, userId: string) {\n        const pond = await this.pondsRepository.findOne({\n            where: { id },\n            relations: ['farm'],\n        });\n\n        if (!pond) {\n            throw new NotFoundException(`Pond with ID ${id} not found`);\n        }\n\n        return pond;\n    }"
);

// We leave verifyOwnership in FarmsService (and PondsService create) because create needs the Farm object!
// In findAll we can remove verifyOwnership because we don't need the farm object.
serviceContent = serviceContent.replace(
    "await this.farmsService.verifyOwnership(farmId, userId);",
    "// OwnershipGuard handles authorization"
);

fs.writeFileSync(servicePath, serviceContent);
