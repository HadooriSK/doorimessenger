const fs = require('fs');
const lines = fs.readFileSync('app.js', 'utf8').split('\n');
lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('gif-btn') || line.toLowerCase().includes('gif-picker') || line.toLowerCase().includes('gifbtn') || line.toLowerCase().includes('gifpicker') || line.toLowerCase().includes('gif-grid')) {
        console.log(`${idx + 1}: ${line}`);
    }
});
