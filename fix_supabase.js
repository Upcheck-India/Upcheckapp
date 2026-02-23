const fs = require('fs');
const { execSync } = require('child_process');

const files = execSync('find backend/src -name "*.spec.ts"').toString().split('\n').filter(Boolean);

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    if (content.includes('useValue: { get: jest.fn() }')) {
        content = content.replace(/useValue: \{ get: jest\.fn\(\) \}/g, "useValue: { get: jest.fn().mockReturnValue('http://dummy.com') }");
        changed = true;
    }

    if (content.includes("mockReturnValue('')")) {
        content = content.replace(/mockReturnValue\(''\)/g, "mockReturnValue('http://dummy.com')");
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content);
        console.log(`Patched ${file}`);
    }
}
