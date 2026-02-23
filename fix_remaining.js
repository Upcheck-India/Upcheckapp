const fs = require('fs');

// 1. Fix ownership.guard.ts
const ogPath = 'backend/src/common/guards/ownership.guard.ts';
let og = fs.readFileSync(ogPath, 'utf8');
og = og.replace('let actualOwnerId = record as Record<string, any>;', 'let actualOwnerId: any = record;');
fs.writeFileSync(ogPath, og);

// 2. Fix jwt-auth.guard.spec.ts
const jwtGuardPath = 'backend/src/auth/guards/jwt-auth.guard.spec.ts';
let jg = fs.readFileSync(jwtGuardPath, 'utf8');
jg = jg.replace('guard = new JwtAuthGuard(reflector);', 'guard = new JwtAuthGuard(reflector, {} as any);');
fs.writeFileSync(jwtGuardPath, jg);

// 3. Fix feed-records.controller.ts
const feedCtrlPath = 'backend/src/feed-records/feed-records.controller.ts';
let fcp = fs.readFileSync(feedCtrlPath, 'utf8');
fcp = fcp.replace('create(@Body() createDto: CreateFeedRecordDto) {', 'create(@Body() createDto: CreateFeedRecordDto, @CurrentUser() user) {');
fs.writeFileSync(feedCtrlPath, fcp);

// 4. Fix expenses.controller.ts
const expCtrlPath = 'backend/src/finances/expenses.controller.ts';
let ecp = fs.readFileSync(expCtrlPath, 'utf8');
ecp = ecp.replace('create(@Body() createDto: CreateExpenseDto) {', 'create(@Body() createDto: CreateExpenseDto, @CurrentUser() user) {');
fs.writeFileSync(expCtrlPath, ecp);

// 5. Fix harvests.controller.ts
const harvCtrlPath = 'backend/src/harvests/harvests.controller.ts';
let hcp = fs.readFileSync(harvCtrlPath, 'utf8');
hcp = hcp.replace('create(@Body() createDto: CreateHarvestDto) {', 'create(@Body() createDto: CreateHarvestDto, @CurrentUser() user: any) {');
fs.writeFileSync(harvCtrlPath, hcp);

// 6. Fix jwt.strategy.ts
const jwtStratPath = 'backend/src/auth/strategies/jwt.strategy.ts';
let jsp = fs.readFileSync(jwtStratPath, 'utf8');
jsp = jsp.replace(/import \{ AuthService \} from '\.\.\/auth\.service';\n/g, '');
jsp = jsp.replace(/private authService: AuthService/g, '');
jsp = jsp.replace(/this\.authService,\n/g, '');
fs.writeFileSync(jwtStratPath, jsp);

// 7. Fix ponds.service.spec.ts
const pondsSpecPath = 'backend/src/ponds/ponds.service.spec.ts';
let psp = fs.readFileSync(pondsSpecPath, 'utf8');
psp = psp.replace(/changeReason: 'Updated name'/g, 'name: "Updated name"');
fs.writeFileSync(pondsSpecPath, psp);

console.log("Applied remaining fixes.");
