const fs = require('fs');
const glob = require('glob');
const path = require('path');

const controllers = glob.sync('backend/src/**/*.controller.ts');

const COMMON_DECORATORS = [
    'Body', 'Controller', 'Delete', 'Get', 'Param', 'Patch', 'Post', 'Put', 'Query', 'UseGuards', 'Req',
    'HttpCode', 'HttpStatus', 'Logger', 'NotFoundException', 'BadRequestException', 'ForbiddenException',
    'Request', 'HttpException', 'Inject'
];

controllers.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Fix implicit 'req' issues by ensuring 'req' is extracted, or by swapping to 'user'
    // where @CurrentUser() user is used.
    
    // In profiles.controller.ts:
    if (file.includes('profiles.controller.ts')) {
        content = content.replace(/req\.user\.email/g, 'user.email');
        content = content.replace(/req\.user\?\.email/g, 'user?.email');
        content = content.replace(/req\.user\?\.id/g, 'user?.id');
        content = content.replace(/req\.user/g, 'user');
        changed = true;
    }

    if (file.includes('sampling.controller.ts')) {
        // "Cannot find name 'user'." on line 14: return this.samplingService.create(createDto, user.id);
        if (content.match(/create\(@Body\(\) createDto: CreateSamplingDto\) {/)) {
            content = content.replace('create(@Body() createDto: CreateSamplingDto) {', 'create(@Body() createDto: CreateSamplingDto, @CurrentUser() user) {');
            changed = true;
        }
    }
    
    // Auto-inject missing from @nestjs/common
    let commonMatch = content.match(/import\s+{([^}]+)}\s+from\s+'@nestjs\/common'/);
    if (commonMatch) {
        let imports = commonMatch[1].split(',').map(s => s.trim()).filter(Boolean);
        let missing = [];
        
        COMMON_DECORATORS.forEach(d => {
            // If the file uses the decorator/class, but hasn't imported it from @nestjs/common
            // Naive check: if it appears as a whole word (not quite whole, but close enough)
            const regex = new RegExp(`\\b${d}\\b`);
            if (regex.test(content) && !imports.includes(d)) {
                // Ensure it's not actually imported elsewhere
                if (!content.includes(`import { ${d} }`)) {
                    missing.push(d);
                }
            }
        });
        
        if (missing.length > 0) {
            let newImports = [...new Set([...imports, ...missing])].join(', ');
            content = content.replace(commonMatch[0], `import { ${newImports} } from '@nestjs/common'`);
            changed = true;
            console.log(`Added [${missing.join(', ')}] to ${file}`);
        }
    }

    if (changed) {
        fs.writeFileSync(file, content);
    }
});
