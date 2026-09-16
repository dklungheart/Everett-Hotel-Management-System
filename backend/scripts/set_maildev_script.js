// Appends/updates the "maildev" npm script in package.json without reordering keys.
const fs = require('fs');
const p = 'package.json';
const raw = fs.readFileSync(p, 'utf8');
const j = JSON.parse(raw);
if (!j.scripts) j.scripts = {};
j.scripts.maildev = 'node scripts/maildev.js';
fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n', 'utf8');
console.log('maildev script =', j.scripts.maildev);
