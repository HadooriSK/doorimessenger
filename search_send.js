const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('messageForm.addEventListener(\'submit\'') || lines[i].includes('db.collection(\'messages\').add')) {
        console.log(i + 1, lines[i].trim());
    }
}
