const fs = require('fs');

const controllers = [
    'backend/src/finances/expenses.controller.ts',
    'backend/src/harvests/harvests.controller.ts',
    'backend/src/sampling/sampling.controller.ts',
    'backend/src/feed-records/feed-records.controller.ts'
];

controllers.forEach(path => {
    let raw = fs.readFileSync(path, 'utf8');
    
    // Inject @CurrentUser if not present
    if (!raw.includes('CurrentUser')) {
        const importStatement = "import { CurrentUser } from '../auth/decorators/current-user.decorator';\n";
        raw = importStatement + raw;
    }
    
    // Fix signatures where I blindly changed it
    raw = raw.replace(/create\(@Body\(\) createDto: ([A-Za-z]+), @Req\(\) req\) {/g, 'create(@Body() createDto: $1, @CurrentUser() user) {');
    raw = raw.replace(/create\(@Body\(\) createDto: ([A-Za-z]+)\) {/g, 'create(@Body() createDto: $1, @CurrentUser() user) {');
    raw = raw.replace(/user\.id/g, 'user.id');
    
    fs.writeFileSync(path, raw);
    console.log(`Patched ${path}`);
});
