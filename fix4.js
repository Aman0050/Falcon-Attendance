const fs = require("fs");
const path = require("path");

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  
  // Replace anything that looks like `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/some/path'
  // with `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/some/path`
  
  content = content.replace(/(`\$\{import\.meta\.env\.VITE_API_URL \|\| 'http:\/\/localhost:3000'\}\/[^']*)'/g, "$1`");

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
console.log("Fixed mismatched quotes!");
