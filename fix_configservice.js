const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const files = execSync('find backend/src -name "*.spec.ts"').toString().split('\n').filter(Boolean);

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Check if it's a test for a controller/guard that likely fails with ConfigService
    if (content.includes('Test.createTestingModule') && !content.includes('ConfigService')) {
        let changed = false;

        // Add import
        content = `import { ConfigService } from '@nestjs/config';\n` + content;

        // Inject ConfigService mock into providers array
        // Replace `providers: [` with `providers: [ { provide: ConfigService, useValue: { get: jest.fn() } }, `
        if (content.match(/providers\s*:\s*\[/)) {
            content = content.replace(/providers\s*:\s*\[/, 'providers: [\n        { provide: ConfigService, useValue: { get: jest.fn() } },');
            changed = true;
        } else if (content.match(/controllers\s*:\s*\[[^\]]+\]\s*,?(\s*)\}\)\.compile\(\);/m)) {
            // No providers array, add it after controllers
            content = content.replace(/(controllers\s*:\s*\[[^\]]+\]\s*,?)(\s*)\}\)\.compile\(\);/m, `$1\n      providers: [\n        { provide: ConfigService, useValue: { get: jest.fn() } }\n      ],$2}).compile();`);
            changed = true;
        }

        if (changed) {
            fs.writeFileSync(file, content, 'utf8');
            console.log(`Patched ${file}`);
        }
    }
}
