const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      if (fullPath.includes('AdminReports')) {
        content = content.replace('http://localhost:5000', 'http://localhost:3000');
      }

      content = content.replace(/\http:\/\/localhost:3000/g, '\\');
      content = content.replace(/'http:\/\/localhost:3000/g, '(import.meta.env.VITE_API_URL || \'http://localhost:3000\')');

      fs.writeFileSync(fullPath, content);
    }
  }
}
processDir('./admin/src');
