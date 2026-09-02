const fs = require("fs");
const path = require("path");

const API_PREFIX = "${import.meta.env.VITE_API_URL || 'http://localhost:3000'}";

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  
  // Fix AdminReports
  content = content.replace("const API_URL = import.meta.env.VITE_API_URL || '\\';", "const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';");

  // Fix other files where `\ was injected
  // e.g. `\/api/admin...` should become `${API_PREFIX}/api/admin...`
  content = content.replace(/`\\\/api/g, "`" + API_PREFIX + "/api");
  
  // Login.tsx: it had 'http://localhost:3000/api/auth/login' which might have become (import.meta.env.VITE_API_URL || 'http://localhost:3000')/api/auth/login'
  // Let's just fix it manually if regex fails
  content = content.replace(/\(import\.meta\.env\.VITE_API_URL \|\| 'http:\/\/localhost:3000'\)\/api/g, "`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api");

  // AuthContext: .get('http://localhost:3000/api/auth/me'...
  content = content.replace(/\(import\.meta\.env\.VITE_API_URL \|\| 'http:\/\/localhost:3000'\)'/g, "import.meta.env.VITE_API_URL || 'http://localhost:3000'");

  fs.writeFileSync(filePath, content);
}

const dir = "./admin/src";
function walk(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const f of files) {
    const full = path.join(dirPath, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith(".tsx") || full.endsWith(".ts")) fixFile(full);
  }
}
walk(dir);
console.log("Fixed!");
