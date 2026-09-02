const fs = require("fs");
const path = require("path");

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  
  content = content.replace(/method:\s*`PATCH',/g, "method: 'PATCH',");
  content = content.replace(/method:\s*`DELETE',/g, "method: 'DELETE',");
  content = content.replace(/if\s*\(status !== `All'\)/g, "if (status !== 'All')");
  content = content.replace(/headers:\s*\{ `Authorization'/g, "headers: { 'Authorization'");

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
console.log("Fixed syntax errors!");
