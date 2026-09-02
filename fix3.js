const fs = require("fs");
const path = require("path");

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  
  content = content.replace(/'\\\/api/g, "`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api");
  // We need to close the backtick instead of single quote at the end of the string.
  // Wait, if it became fetch('`\/api...', the end of string is ')
  // Actually, I can just use a regex to capture until the end single quote and replace it.
  
  // To avoid regex hell, I'll just replace 'http://localhost:3000 manually if they still exist.
  // But wait, they are currently '\/api/admin/settings' (a single string with a backslash!)
  // The original was 'http://localhost:3000/api/admin/settings'
  
  // Let me just restore ALL files using a simpler pattern:
  // We want to replace '\/api/admin/settings' with `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/settings`
  
  content = content.replace(/'\\\/api([^']*)'/g, "`\${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api$1`");

  // AuthContext:
  content = content.replace(/'\\\/api\/auth\/me'/g, "`\${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/me`");
  
  // Login:
  content = content.replace(/'\\\/api\/auth\/login'/g, "`\${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/login`");

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
console.log("Fixed single quotes!");
