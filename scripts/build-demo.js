const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'dist');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
// Publish only browser assets; never copy the repository, database or .env files.
for (const entry of fs.readdirSync(path.join(root, 'frontend'), { recursive: true, withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const source = path.join(entry.parentPath || entry.path, entry.name);
  const relative = path.relative(path.join(root, 'frontend'), source);
  if (!/\.(html|css|js|webp|svg)$/.test(relative) && !relative.endsWith('webhive-hero2-optimized.mp4') && !relative.endsWith('vector2.png')) continue;
  const target = path.join(out, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}
fs.writeFileSync(path.join(out, 'assets/js/config.js'), "window.WEBHIVE_MODE = 'demo';\n");
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log('Static demo built in dist/');
