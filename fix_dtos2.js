const fs = require('fs');
const glob = require('glob');
const path = require('path');

const updateDtos = glob.sync('backend/src/**/dto/update-*.dto.ts');

updateDtos.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace swagger with mapped-types
    if (content.includes('@nestjs/swagger')) {
        content = content.replace('@nestjs/swagger', '@nestjs/mapped-types');
        fs.writeFileSync(file, content);
        console.log(`Refactored ${file}`);
    } else {
        // Redo the generation properly
        const match = content.match(/export class Update([A-Za-z]+)Dto/);
        if (!match) return;
        const entityName = match[1];
        
        const dir = path.dirname(file);
        const createDtoFile = fs.readdirSync(dir).find(f => f.startsWith('create-') && f.endsWith('.dto.ts'));
        
        if (createDtoFile) {
            let createDtoContent = fs.readFileSync(path.join(dir, createDtoFile), 'utf8');
            let createDtoMatch = createDtoContent.match(/export class (Create[A-Za-z]+Dto)/);
            
            if (createDtoMatch) {
                let createDtoClassName = createDtoMatch[1];
                let createDtoImportName = createDtoFile.replace('.ts', '');
                
                let newContent = `import { PartialType } from '@nestjs/mapped-types';\n`;
                newContent += `import { ${createDtoClassName} } from './${createDtoImportName}';\n\n`;
                newContent += `export class Update${entityName}Dto extends PartialType(${createDtoClassName}) {}\n`;
                
                fs.writeFileSync(file, newContent);
                console.log(`Refactored ${file}`);
            }
        }
    }
});
