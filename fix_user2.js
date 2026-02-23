const fs = require('fs');

const controllers = [
    'backend/src/finances/expenses.controller.ts',
    'backend/src/harvests/harvests.controller.ts',
    'backend/src/sampling/sampling.controller.ts',
    'backend/src/feed-records/feed-records.controller.ts'
];

controllers.forEach(path => {
    let raw = fs.readFileSync(path, 'utf8');
    
    // Inject @CurrentUser if not imported
    if (!raw.includes('import { CurrentUser }')) {
        const importStatement = "import { CurrentUser } from '../auth/decorators/current-user.decorator';\n";
        raw = importStatement + raw;
        fs.writeFileSync(path, raw);
        console.log(`Added import to ${path}`);
    }
});
