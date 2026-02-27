const fs = require('fs');
const glob = require('glob');
const path = require('path');

const updateDtos = glob.sync('backend/src/**/dto/update-*.dto.ts');

updateDtos.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Skip if it already uses PartialType
    if (content.includes('PartialType')) {
        return;
    }

    const match = content.match(/export class Update([A-Za-z]+)Dto/);
    if (!match) return;
    const entityName = match[1];

    // We assume CreateDto is exported from `create-${kebab-case-name}.dto.ts`
    // but the easiest is just replacing the class body.
    // However, some might have custom validation, so blindly wiping might be risky.
    // Instead we'll regex match the CreateDto import and construct the new class.

    // Attempting a simpler regex:
    // Extract base name of the entity by removing 'Update'. 
    // And 'Dto' from the class name.

    // Actually, NestJS CLI generated update DTOs usually look like:
    // import { PartialType } from '@nestjs/swagger'; /* or @nestjs/mapped-types */
    // import { Create[Entity]Dto } from './create-[entity].dto';
    // export class Update[Entity]Dto extends PartialType(Create[Entity]Dto) {}

    // We can parse the directory to find the create DTO name.
    const dir = path.dirname(file);
    const createDtoFile = fs.readdirSync(dir).find(f => f.startsWith('create-') && f.endsWith('.dto.ts'));

    if (createDtoFile) {
        let createDtoContent = fs.readFileSync(path.join(dir, createDtoFile), 'utf8');
        let createDtoMatch = createDtoContent.match(/export class (Create[A-Za-z]+Dto)/);

        if (createDtoMatch) {
            let createDtoClassName = createDtoMatch[1];
            let createDtoImportName = createDtoFile.replace('.ts', '');

            let newContent = `import { PartialType } from '@nestjs/swagger';\n`;
            newContent += `import { ${createDtoClassName} } from './${createDtoImportName}';\n\n`;
            newContent += `export class Update${entityName}Dto extends PartialType(${createDtoClassName}) {}\n`;

            fs.writeFileSync(file, newContent);
            console.log(`Refactored ${file}`);
        }
    }
});
