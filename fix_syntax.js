const fs = require('fs');
let js = fs.readFileSync('app.js', 'utf8');

// Replace wrongly escaped backticks and template variables
js = js.replace(/\\`/g, '`');
js = js.replace(/\\\$\{/g, '${');

fs.writeFileSync('app.js', js);
console.log('Fixed syntax error in app.js!');
