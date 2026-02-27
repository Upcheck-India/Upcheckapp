const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const decoratorPath = path.resolve('backend/src/auth/decorators/current-user.decorator');

walkDir('backend/src', function(filePath) {
  if (filePath.endsWith('.controller.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('@CurrentUser(') && !content.includes('current-user.decorator')) {
        const absFilePath = path.resolve(filePath);
        let relPath = path.relative(path.dirname(absFilePath), decoratorPath).replace(/\\/g, '/');
        if (!relPath.startsWith('.')) relPath = './' + relPath;
        
        const importStmt = `import { CurrentUser } from '${relPath}';\n`;
        content = importStmt + content;
        fs.writeFileSync(filePath, content);
        console.log(`Updated imports in ${filePath}`);
    }
  }
});
