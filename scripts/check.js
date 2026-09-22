const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');
for (const folder of ['backend', 'frontend/assets/js', 'scripts', 'tests']) {
  for (const entry of fs.readdirSync(path.join(root, folder), { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
    const full = path.join(entry.parentPath || entry.path, entry.name);
    if (full.includes(`${path.sep}node_modules${path.sep}`)) continue;
    execFileSync(process.execPath, ['--check', full]);
  }
}
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString().split('\0').filter(Boolean);
const forbidden = tracked.filter(file => /(^|\/)\.env(\.|$)/.test(file) && !file.endsWith('.env.example') || /(^|\/)(node_modules|dist)\//.test(file) || file.endsWith('.session.sql'));
if (forbidden.length) throw new Error(`Private/generated files tracked: ${forbidden.join(', ')}`);
console.log('JavaScript syntax and tracked-file checks passed.');
